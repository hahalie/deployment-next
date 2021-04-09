import { Session } from "@shopify/shopify-api/dist/auth/session";
import redis from "redis";
import { promisify } from "util";

// class RedisStore {
//   constructor() {
//     // Create a new redis client
//     this.client = redis.createClient({
//       host: "127.0.0.1",
//       port: 6379,
//     });
//     // Use Node's `promisify` to have redis return a promise from the client methods
//     this.getAsync = promisify(this.client.get).bind(this.client);
//     this.setAsync = promisify(this.client.set).bind(this.client);
//     this.delAsync = promisify(this.client.del).bind(this.client);
//   }

//   /*
//     The storeCallback takes in the Session, and sets a stringified version of it on the redis store
//     This callback is used for BOTH saving new Sessions and updating existing Sessions.
//     If the session can be stored, return true
//     Otherwise, return false
//   */
//   storeCallback = async (session) => {
//     try {
//       // Inside our try, we use the `setAsync` method to save our session.
//       // This method returns a boolean (true is successful, false if not)
//       return await this.setAsync(session.id, JSON.stringify(session));
//     } catch (err) {
//       // throw errors, and handle them gracefully in your application
//       throw new Error(err);
//     }
//   };

//   /*
//     The loadCallback takes in the id, and uses the getAsync method to access the session data
//     If a stored session exists, it's parsed and returned
//     Otherwise, return undefined
//   */
//   loadCallback = async (id) => {
//     try {
//       // Inside our try, we use `getAsync` to access the method by id
//       // If we receive data back, we parse and return it
//       // If not, we return `undefined`
//       let reply = await this.getAsync(id);
//       if (reply) {
//         return JSON.parse(reply);
//       } else {
//         return undefined;
//       }
//     } catch (err) {
//       throw new Error(err);
//     }
//   };

//   /*
//     The deleteCallback takes in the id, and uses the redis `del` method to delete it from the store
//     If the session can be deleted, return true
//     Otherwise, return false
//   */
//   deleteCallback = async (id) => {
//     try {
//       // Inside our try, we use the `delAsync` method to delete our session.
//       // This method returns a boolean (true is successful, false if not)
//       return await this.delAsync(id);
//     } catch (err) {
//       throw new Error(err);
//     }
//   };
// }

const RedisStore = () => {
  // Create a new redis client
  const client = redis.createClient({
    host: "127.0.0.1",
    port: 6379,
  });
  // Use Node's `promisify` to have redis return a promise from the client methods
  const getAsync = promisify(client.get).bind(client);
  const setAsync = promisify(client.set).bind(client);
  const delAsync = promisify(client.del).bind(client);

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
};

// Export the class
export default RedisStore;
