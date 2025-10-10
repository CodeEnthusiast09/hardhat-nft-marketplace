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
    const chainId = "31337";

    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...");

        const deploymentPath = path.join(
            __dirname,
            `../ignition/deployments/chain-${network.config.chainId}/deployed_addresses.json`,
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
            "Raffle",
            nftMarketPlaceAddress,
        )) as unknown as NftMarketplace;

        /**
         * if you want to generate a valid utils.ts and overwrite the file with proper TypeScript:
         */

        const abi = nftMarketPlace.interface.formatJson();

        const fileContent = `export const wagmiContractConfig = {
          address: "${nftMarketPlace.target}", abi: ${abi}, } as const;`;

        fs.writeFileSync(frontEndUtils, fileContent);

        /**
         * if you want to generate a different files
         */

        // fs.writeFileSync(
        //     frontEndContractsFile,
        //     JSON.stringify(contractAddresses),
        // );

        // fs.writeFileSync(frontEndAbiFile, raffle.interface.formatJson());

        console.log("Front end written!");
    }
}

updateFrontend()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
