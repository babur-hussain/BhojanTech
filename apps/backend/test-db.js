const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./src/models/User').User;
  const users = await User.find({}).select('email selectedBranchId role');
  console.log(users);
  process.exit(0);
});
