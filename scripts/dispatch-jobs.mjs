const endpoint = process.env.JOBS_DISPATCH_URL || "http://localhost:3000/api/jobs/dispatch";
const secret = process.env.JOBS_DISPATCH_SECRET || "";

if (!secret) {
  console.error("Missing JOBS_DISPATCH_SECRET");
  process.exit(1);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-jobs-secret": secret
  },
  body: JSON.stringify({ batchSize: 20 })
});

const body = await response.text();
console.log(body);

if (!response.ok) {
  process.exit(1);
}
