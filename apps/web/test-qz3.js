import qz from 'qz-tray';
qz.security.setCertificatePromise((resolve) => resolve(null));
qz.security.setSignaturePromise(() => (resolve) => resolve(null));

async function test() {
  await qz.websocket.connect({ retries: 0 });
  console.log("Connected with null cert");
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
