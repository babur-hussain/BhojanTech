const { S3Client, GetBucketLocationCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: "YOUR_ACCESS_KEY",
    secretAccessKey: "YOUR_SECRET_KEY"
  }
});

const run = async () => {
  try {
    const data = await client.send(new GetBucketLocationCommand({ Bucket: "bhojan-tech" }));
    console.log("Bucket location:", data.LocationConstraint || "us-east-1 (default/null)");
  } catch (err) {
    console.log("Error:", err.Code || err.name, "-", err.message);
  }
};
run();
