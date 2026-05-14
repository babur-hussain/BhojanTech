async function test() {
  try {
    const payload = {
        restaurantId: "661234567890123456789012", // dummy
        tableId: "661234567890123456789012",
        items: [{
            menuItemId: "1",
            name: "Test",
            quantity: 1,
            priceAtOrderTime: 100
        }],
        customerName: "Test",
        customerPhone: "1234567890",
        paymentMode: "PAY_AT_COUNTER"
    };
    const res = await fetch('http://localhost:8080/api/online-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    console.log(res.status, await res.text());
  } catch(e) {
    console.error(e.message);
  }
}
test();
