// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BasicNftTwoModule = buildModule("BasicNftTwoModule", (m) => {
    const deployer = m.getAccount(0);

    const basicNftTwo = m.contract("BasicNftTwo", [], {
        from: deployer,
    });

    return { basicNftTwo };
});

export default BasicNftTwoModule;
