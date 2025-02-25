require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    saigon: {
      url: "https://saigon-testnet.roninchain.com/v2/rpc",
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 20_000_000_000,
      chainId: 2021
    }
  }
};