// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title PriceConverter
 * @notice Library for converting token amounts between different currencies using Chainlink price feeds
 * @dev Optimized for precision by rearranging multiplication and division operations
 */

library PriceConverter {
    /**
     * @notice Convert an amount from one token to another using Chainlink price feeds
     * @param amount Amount in the source token (with source token decimals)
     * @param fromFeed Chainlink price feed for source token (token/USD)
     * @param fromDecimals Decimals of the source token
     * @param toFeed Chainlink price feed for target token (token/USD)
     * @param toDecimals Decimals of the target token
     * @return Equivalent amount in target token (with target token decimals)
     * @dev Formula: amount * (fromPrice/toPrice) * (10^toDecimals/10^fromDecimals)
     *      Rearranged to minimize precision loss: (amount * fromPrice * 10^toDecimals) / (toPrice * 10^fromDecimals)
     */

    function convertPrice(
        uint256 amount,
        AggregatorV3Interface fromFeed,
        uint8 fromDecimals,
        AggregatorV3Interface toFeed,
        uint8 toDecimals
    ) internal view returns (uint256) {
        // If same price feed, only adjust for decimal differences
        if (address(fromFeed) == address(toFeed)) {
            if (fromDecimals == toDecimals) {
                return amount;
            } else if (fromDecimals > toDecimals) {
                return amount / (10 ** (fromDecimals - toDecimals));
            } else {
                return amount * (10 ** (toDecimals - fromDecimals));
            }
        }

        // Get prices from Chainlink oracles
        uint256 fromPriceUsd = getTokenPriceInUsd(fromFeed);
        uint256 toPriceUsd = getTokenPriceInUsd(toFeed);

        // Improved precision: do all multiplications before divisions
        // (amount * fromPrice * 10^toDecimals) / (toPrice * 10^fromDecimals)
        uint256 convertedAmount = (amount * fromPriceUsd * (10 ** toDecimals)) / (toPriceUsd * (10 ** fromDecimals));

        return convertedAmount;
    }

    /**
     * @notice Get the USD price of a token from a Chainlink price feed
     * @param priceFeed Chainlink aggregator interface for token/USD pair
     * @return Price with 8 decimals (standard Chainlink format)
     * @dev Chainlink price feeds return prices with 8 decimals for USD pairs
     */
    function getTokenPriceInUsd(AggregatorV3Interface priceFeed) internal view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price from feed");
        return uint256(price);
    }

    /**
     * @notice Get the USD value of a token amount
     * @param amount Amount of tokens (with token decimals)
     * @param priceFeed Chainlink price feed for the token
     * @param tokenDecimals Decimals of the token
     * @return USD value with 8 decimals
     * @dev Useful for displaying values in USD on frontend
     */
    function getUsdValue(
        uint256 amount,
        AggregatorV3Interface priceFeed,
        uint8 tokenDecimals
    ) internal view returns (uint256) {
        uint256 price = getTokenPriceInUsd(priceFeed);
        // (amount * price) / 10^tokenDecimals gives USD with 8 decimals
        return (amount * price) / (10 ** tokenDecimals);
    }

    /**
     * @notice Get the token amount equivalent to a USD value
     * @param usdAmount USD amount with 8 decimals
     * @param priceFeed Chainlink price feed for the token
     * @param tokenDecimals Decimals of the token
     * @return Token amount with token decimals
     * @dev Useful for calculations like "how much ETH equals $1000?"
     */
    function getTokenAmountFromUsd(
        uint256 usdAmount,
        AggregatorV3Interface priceFeed,
        uint8 tokenDecimals
    ) internal view returns (uint256) {
        uint256 price = getTokenPriceInUsd(priceFeed);
        // (usdAmount * 10^tokenDecimals) / price
        return (usdAmount * (10 ** tokenDecimals)) / price;
    }
}
