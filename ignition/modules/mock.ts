import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DECIMALS = 8;
const INITIAL_PRICE = "200000000000"; // 2000

export default buildModule("MocksModule", (m) => {
    const deployer = m.getAccount(0);

    const mockV3Aggregator = m.contract(
        "MockV3Aggregator",
        [DECIMALS, INITIAL_PRICE],
        { from: deployer },
    );

    return { mockV3Aggregator };
});
