const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.ATTENDANCE_1155_ADDRESS;
  const sessionId = BigInt(process.env.ATTENDANCE_SESSION_ID || "20260508");

  if (!contractAddress) {
    throw new Error("Missing ATTENDANCE_1155_ADDRESS in env");
  }

  const contract = await hre.ethers.getContractAt(
    "MotusAttendanceCertificate1155",
    contractAddress
  );

  const tx = await contract.setSessionMintEnabled(sessionId, true);
  console.log("Enabling session mint... tx:", tx.hash);
  await tx.wait();

  const enabled = await contract.sessionMintEnabled(sessionId);
  console.log(`Session ${sessionId.toString()} enabled:`, enabled);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
