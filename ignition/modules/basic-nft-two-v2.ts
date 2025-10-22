import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BasicNftTwoV2Module = buildModule("BasicNftTwoV2Module", (m) => {
    const deployer = m.getAccount(0);
    const basicNftTwo = m.contract("BasicNftTwo", [], {
        from: deployer,
    });
    return { basicNftTwo };
});

export default BasicNftTwoV2Module;
