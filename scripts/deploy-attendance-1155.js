const hre = require("hardhat");

async function main() {
  // Example URI: ipfs://<CID>/{id}.json
  const baseURI =
    process.env.ATTENDANCE_1155_BASE_URI || "ipfs://REPLACE_WITH_CID/{id}.json";

  const Contract = await hre.ethers.getContractFactory(
    "MotusAttendanceCertificate1155"
  );
  const contract = await Contract.deploy(baseURI);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("MotusAttendanceCertificate1155 deployed:", address);
  console.log("Base URI:", baseURI);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
