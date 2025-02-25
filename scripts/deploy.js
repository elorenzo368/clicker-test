const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Desplegar BananaNFT primero
  const BananaNFT = await hre.ethers.getContractFactory("BananaNFT");
  const bananaNFT = await BananaNFT.deploy(
    "0xa60c1e07fa030e4b49eb54950adb298ab94dd312", // VRF Coordinator Saigon
    "0x6168499c0cffcacd000000000000000000000000000000000000000000000000", // Key Hash
    "10000000000000000" // Fee (0.01 RON en wei)
  );
  await bananaNFT.waitForDeployment();
  console.log("BananaNFT deployed to:", await bananaNFT.getAddress());

  // Desplegar BananaTicket con la dirección de BananaNFT
  const BananaTicket = await hre.ethers.getContractFactory("BananaTicket");
  const bananaTicket = await BananaTicket.deploy(await bananaNFT.getAddress());
  await bananaTicket.waitForDeployment();
  console.log("BananaTicket deployed to:", await bananaTicket.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});