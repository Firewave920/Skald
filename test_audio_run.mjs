const WS_URL = "ws://localhost:9222/devtools/page/8BFA4C18330058F908F0FFD0A1C828BF";
const TIMEOUT_MS = 20_000;

const ws = new WebSocket(WS_URL);
await new Promise((res) => ws.addEventListener("open", res));

const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error(`Timed out after ${TIMEOUT_MS} ms`)),
    TIMEOUT_MS,
  );
  ws.send(JSON.stringify({
    id: 1,
    method: "Runtime.evaluate",
    params: {
      expression: `
        window.__TAURI_INTERNALS__.invoke("test_audio", {
          serverUrl: "http://192.168.1.238:13378",
          username:  "Testuser",
          password:  "5v!nrlm3ywADW@K&2h!B5qiUA#NreI",
          itemId:    "1b74d50c-dfb0-4c7f-9955-3b5fa3217790",
        })
      `,
      awaitPromise: true,
      returnByValue: true,
    },
  }));
  ws.addEventListener("message", (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id !== 1) return;
    clearTimeout(timer);
    resolve(msg);
  });
  ws.addEventListener("error", (e) => { clearTimeout(timer); reject(e); });
});

ws.close();

if (result.result?.exceptionDetails) {
  console.error("FAILED:", result.result.exceptionDetails.exception?.value
    ?? JSON.stringify(result.result.exceptionDetails));
  process.exit(1);
} else {
  console.log("SUCCESS:", result.result?.result?.value);
}
