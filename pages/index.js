import { useCallback } from "react";

import { useMutation, gql, useQuery } from "@apollo/client";
import { Heading, Page, Button } from "@shopify/polaris";

const scriptTagUrl =
  "https://firebasestorage.googleapis.com/v0/b/shopify-app-42433.appspot.com/o/sticky-atc.js?alt=media&token=21b39b2e-bb82-4b7a-9e45-274a8b4bdb24";

const GET_SCRIPT_TAGS = gql`
  {
    scriptTags(first: 10) {
      edges {
        node {
          id
          src
        }
      }
    }
  }
`;

const CREATE_SCRIPT_TAG = gql`
  mutation scriptTagCreate($input: ScriptTagInput!) {
    scriptTagCreate(input: $input) {
      scriptTag {
        id
        src
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_SCRIPT_TAG = gql`
  mutation scriptTagUpdate($id: ID!, $input: ScriptTagInput!) {
    scriptTagUpdate(id: $id, input: $input) {
      scriptTag {
        id
        src
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DELETE_SCRIPT_TAG = gql`
  mutation scriptTagDelete($id: ID!) {
    scriptTagDelete(id: $id) {
      deletedScriptTagId
      userErrors {
        field
        message
      }
    }
  }
`;

const Index = () => {
  const { loading, error, data } = useQuery(GET_SCRIPT_TAGS);
  const [scriptTagCreate] = useMutation(CREATE_SCRIPT_TAG);
  const [scriptTagUpdate] = useMutation(UPDATE_SCRIPT_TAG);
  const [scriptTagDelete] = useMutation(DELETE_SCRIPT_TAG);

  const handleRest = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      console.log("res", res);
      const data = res.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleScriptTag = useCallback(
    () =>
      scriptTagDelete({
        variables: {
          id: "gid://shopify/ScriptTag/171016618150",
          input: {
            src: scriptTagUrl,
          },
        },
      })
        .then(console.log)
        .catch(console.error),
    []
  );

  if (loading) return "Loading...";
  if (error) return `Error! ${error.message}`;

  console.log("data", data);

  return (
    <Page>
      <Button onClick={handleRest}>REST Test</Button>
      <Button onClick={handleScriptTag}>Create / Update Script Tag</Button>
      <Heading>Shopify app with Node and React 🎉</Heading>
    </Page>
  );
};

export default Index;
