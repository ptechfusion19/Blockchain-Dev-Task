const fetch = (...args) => import('node-fetch').then(({default:fetch}) => fetch(...args));
(async () => {
  const res = await fetch('http://localhost:3000/buy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      buyToken:  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      sellAmount:"4000000000000000",
      taker: "0xYourUserAddressHere",
      simulateOnly: true
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
})();
