const https = require('https');

const data = JSON.stringify({
  collection: 'tables',
  database: 'bhojantech',
  dataSource: 'Cluster0',
});

// We can't use Data API easily without the key, I will just write a script and run it in the docker container remotely.
