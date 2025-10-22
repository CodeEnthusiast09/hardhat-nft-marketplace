import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BasicNftV2Module = buildModule("BasicNftV2Module", (m) => {
    const deployer = m.getAccount(0);
    const basicNft = m.contract("BasicNft", [], {
        from: deployer,
    });
    return { basicNft };
});

export default BasicNftV2Module;
