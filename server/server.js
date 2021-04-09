import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import Shopify, { ApiVersion } from "@shopify/shopify-api";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import redis from "redis";
import { promisify } from "util";
// import RedisStore from "./redis-store";
dotenv.config();

//* Redis Storage Starts
// Create a new redis client
const RedisClient = redis.createClient({
  host: "127.0.0.1",
  port: 6379,
});
// Use Node's `promisify` to have redis return a promise from the client methods
const getAsync = promisify(RedisClient.get).bind(RedisClient);
const setAsync = promisify(RedisClient.set).bind(RedisClient);
const delAsync = promisify(RedisClient.del).bind(RedisClient);

/*
    The storeCallback takes in the Session, and sets a stringified version of it on the redis store
    This callback is used for BOTH saving new Sessions and updating existing Sessions.
    If the session can be stored, return true
    Otherwise, return false
  */
const storeCallback = async (session) => {
  try {
    // Inside our try, we use the `setAsync` method to save our session.
    // This method returns a boolean (true is successful, false if not)
    return await setAsync(session.id, JSON.stringify(session));
  } catch (err) {
    // throw errors, and handle them gracefully in your application
    throw new Error(err);
  }
};

/*
    The loadCallback takes in the id, and uses the getAsync method to access the session data
    If a stored session exists, it's parsed and returned
    Otherwise, return undefined
  */
const loadCallback = async (id) => {
  try {
    // Inside our try, we use `getAsync` to access the method by id
    // If we receive data back, we parse and return it
    // If not, we return `undefined`
    let reply = await getAsync(id);
    if (reply) {
      return JSON.parse(reply);
    } else {
      return undefined;
    }
  } catch (err) {
    throw new Error(err);
  }
};

/*
    The deleteCallback takes in the id, and uses the redis `del` method to delete it from the store
    If the session can be deleted, return true
    Otherwise, return false
  */
const deleteCallback = async (id) => {
  try {
    // Inside our try, we use the `delAsync` method to delete our session.
    // This method returns a boolean (true is successful, false if not)
    return await delAsync(id);
  } catch (err) {
    throw new Error(err);
  }
};
//* Redis Storage Ends
const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
  API_VERSION: ApiVersion.October20,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  SESSION_STORAGE: new Shopify.Session.CustomSessionStorage(
    storeCallback,
    loadCallback,
    deleteCallback
  ),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS = {};

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  server.keys = [Shopify.Context.API_SECRET_KEY];
  server.use(
    createShopifyAuth({
      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { id, shop, accessToken, scope, state } = ctx.state.shopify;
        console.log("state", ctx.state);
        storeCallback({
          id,
          shop,
          state,
          scope,
          accessToken,
        });
        ACTIVE_SHOPIFY_SHOPS[shop] = scope;
        // ACTIVE_SHOPIFY_SHOPS["accessToken"] = accessToken;

        const response = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "/webhooks",
          topic: "APP_UNINSTALLED",
          webhookHandler: async (topic, shop, body) =>
            delete ACTIVE_SHOPIFY_SHOPS[shop],
        });

        if (!response.success) {
          console.log(
            `Failed to register APP_UNINSTALLED webhook: ${response.result}`
          );
        }

        const sessionInfo = await loadCallback(id)

        sessionInfo 
        ? ctx.redirect(`https://${shop}/admin/apps`) 
        : ctx.redirect(`/?shop=${shop}`);
        // Redirect to app with shop parameter upon auth
        ctx.redirect(`/?shop=${shop}`);
      },
    })
  );

  const handleRequest = async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  };

  router.get("/", async (ctx) => {
    const shop = ctx.query.shop;

    // This shop hasn't been seen yet, go through OAuth to create a session
    if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
      ctx.redirect(`/auth?shop=${shop}`);
    } else {
      await handleRequest(ctx);
    }
  });

  // router.get("/api/products", async (ctx) => {});

  router.post("/webhooks", async (ctx) => {
    try {
      await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
    }
  });

  router.post(
    "/graphql",
    verifyRequest({ returnHeader: true }),
    async (ctx, next) => {
      await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
    }
  );

  router.get("(/_next/static/.*)", handleRequest); // Static content is clear
  router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear
  router.get("(.*)", verifyRequest(), handleRequest); // Everything else must have sessions

  server.use(router.allowedMethods());
  server.use(router.routes());
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
