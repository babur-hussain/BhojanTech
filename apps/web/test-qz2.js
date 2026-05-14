import qz from 'qz-tray';
qz.security.setCertificatePromise((resolve) => resolve(''));
qz.security.setSignaturePromise(() => (resolve) => resolve(''));

async function test() {
  await qz.websocket.connect({ retries: 0 });
  const cfg = qz.configs.create(null);
  console.log("Config created with null:", cfg.printer);
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
