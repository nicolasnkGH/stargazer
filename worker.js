export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "stargazer-700732233634.us-central1.run.app";
    const modifiedRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual"
    });
    return fetch(modifiedRequest);
  }
};