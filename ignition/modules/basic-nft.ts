// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BasicNftModule = buildModule("BasicNftModule", (m) => {
    const deployer = m.getAccount(0);

    const basicNft = m.contract("BasicNft", [], {
        from: deployer,
    });

    return { basicNft };
});

export default BasicNftModule;
