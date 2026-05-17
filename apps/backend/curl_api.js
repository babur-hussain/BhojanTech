const jwt = require('jsonwebtoken');
const axios = require('axios');

async function run() {
  const secret = 'supersecret_dev_key';
  const token = jwt.sign({ 
    id: '123', 
    role: 'OWNER', 
    restaurantId: '6a064f226d039db9c478b4da',
    branchId: '6a064f226d039db9c478b4dc'
  }, secret, { expiresIn: '1h' });
  
  try {
    const res = await axios.get('http://localhost:8080/api/menu/items', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-branch-id': '6a064f226d039db9c478b4dc'
      }
    });
    console.log("Response:", JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
