import {
    frontEndContractsFile,
    frontEndAbiFile,
    frontEndUtils,
} from "../helper-hardhat.config";
import fs from "fs";
import { network, ethers } from "hardhat";
import path from "path";
import { NftMarketplace } from "../typechain-types";

async function updateFrontend() {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...");

        const chainId = network.config.chainId?.toString() || "31337";

        const deploymentPath = path.join(
            __dirname,
            `../ignition/deployments/chain-${chainId}/deployed_addresses.json`,
        );

        const deploymentJson = JSON.parse(
            fs.readFileSync(deploymentPath, "utf8"),
        );

        const nftMarketPlaceAddress =
            deploymentJson["NFTMarketPlaceModule#NFTMarketplace"];

        if (!nftMarketPlaceAddress) {
            throw new Error("Address not found");
        }

        const nftMarketPlace = (await ethers.getContractAt(
            "NftMarketplace", // Changed from "Raffle"
            nftMarketPlaceAddress,
        )) as unknown as NftMarketplace;

        // Read existing frontend file to preserve addresses for other chains
        let existingAddresses: Record<string, string> = {
            "11155111": "",
            "31337": "",
        };

        try {
            const existingContent = fs.readFileSync(frontEndUtils, "utf8");
            const addressMatch = existingContent.match(
                /CONTRACT_ADDRESSES\s*=\s*({[\s\S]*?})\s*as const/,
            );
            if (addressMatch) {
                const addressObj = addressMatch[1]
                    .replace(/\/\/.*/g, "") // Remove comments
                    .replace(/(\d+):/g, '"$1":'); // Quote keys
                existingAddresses = JSON.parse(addressObj);
            }
        } catch (error) {
            console.log("Creating new frontend config file...");
        }

        // Update the address for current chain
        existingAddresses[chainId] = nftMarketPlace.target as string;

        const abi = nftMarketPlace.interface.formatJson();

        const fileContent = `const CONTRACT_ADDRESSES = {
  11155111: "${existingAddresses["11155111"]}", // Sepolia
  31337: "${existingAddresses["31337"]}", // Hardhat
} as const;

export const getContractAddress = (
  chainId: number | undefined,
): \`0x\${string}\` => {
  if (!chainId) return CONTRACT_ADDRESSES[11155111] as \`0x\${string}\`;
  return (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] ||
    CONTRACT_ADDRESSES[11155111]) as \`0x\${string}\`;
};

export const ABI = ${abi} as const;
`;

        fs.writeFileSync(frontEndUtils, fileContent);

        console.log(`Front end written! Updated address for chain ${chainId}`);
        console.log(`Contract address: ${nftMarketPlace.target}`);
    }
}

updateFrontend()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
