export async function GET() {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL is not set");
  }

  const config = {
    accountAssociation: accountAssociations[appUrl],
    frame: {
      version: "1",
      name: "Stylize Me",
      iconUrl: `${appUrl}/splash.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/og.png`,
      buttonTitle: "Try it now",
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#f7f7f7",
      webhookUrl: `${appUrl}/api/webhooks/farcaster`,
    },
  };

  return Response.json(config);
}

/** Domain associations for different environments. Default is signed by @stephancill and is valid for localhost */
const accountAssociations = {
  "http://localhost:3000": {
    header:
      "eyJmaWQiOjE2ODksInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyNzM4QjIxY0I5NTIwMzM4RjlBMzc1YzNiOTcxQjE3NzhhZTEwMDRhIn0",
    payload: "eyJkb21haW4iOiJsb2NhbGhvc3QifQ",
    signature:
      "MHhmOWJkZGQ1MDA4Njc3NjZlYmI1ZmNjODk1NThjZWIxMTc5NjAwNjRlZmFkZWZjZmY4NGZhMzdiMjYxZjU1ZmYzMmZiMDg5NmY4NWU0MmM1YjM4MjQxN2NlMjFhOTBlYmM4YTIzOWFkNjE0YzA2ODM0ZDQ1ODk5NDI3YjE5ZjNkYTFi",
  },
  "https://stylize.steer.fun": {
    header:
      "eyJmaWQiOjE2ODksInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyNzM4QjIxY0I5NTIwMzM4RjlBMzc1YzNiOTcxQjE3NzhhZTEwMDRhIn0",
    payload: "eyJkb21haW4iOiJzdHlsaXplLnN0ZWVyLmZ1biJ9",
    signature:
      "MHgzMzU4MzFkZTM3MjllNmVjZDM3MTdiODc1NzhkNWI1NGZiNmQyODE2NzIxYjE2ODlhMTMwNDlkYTAwNDRhOGEzMGE5NTU1MTRhNTQ3NzQ5YmNhMzJhMTlmYTQ0OTVlNDI3Y2ZiOGVjOTA0MjJlYTZlZDRkYmI3NjBjY2QwNzFmNzFj",
  },
  "https://1cf731bbcee8.ngrok-free.app": {
    header:
      "eyJmaWQiOjE2ODksInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyNzM4QjIxY0I5NTIwMzM4RjlBMzc1YzNiOTcxQjE3NzhhZTEwMDRhIn0",
    payload: "eyJkb21haW4iOiIxY2Y3MzFiYmNlZTgubmdyb2stZnJlZS5hcHAifQ",
    signature:
      "MHg4ZGY5Yzk5NGJmMDZjY2QwMTk2MzhkOTlhZDQ0Y2NlZjQxOWE5MzRjYzEyNzg5NGRlMzdiMmM2N2M4ZTEyMWMyMzZhMjJkOGQ2YzNiYWEyMjA4MmI5ZTExNDI0MTQ0ZDMxMzdmNjNiYTQ4MjI2ZWJlMzNlZjYyNGU2ZDgyZTY5MDFj",
  },
};
