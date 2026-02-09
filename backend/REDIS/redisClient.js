
const {Redis} = require("@upstash/redis")
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})


async function testRedis() {
  await redis.set("foo", "bar");
  const val = await redis.get("foo");
  console.log(val);
}

testRedis();
module.exports = redis