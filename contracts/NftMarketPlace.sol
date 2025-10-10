// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

// Check out https://github.com/Fantom-foundation/Artion-Contracts/blob/5c90d2bc0401af6fb5abf35b860b762b31dfee02/contracts/FantomMarketplace.sol
// For a full decentralized nft marketplace

error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NftMarketplace__ItemNotForSale(address nftAddress, uint256 tokenId);
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NoProceeds();
error NftMarketplace__NotOwner();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__TokenNotSupported();
error NftMarketplace__TransferFailed();

contract NftMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 price;
        address seller;
        address paymentToken;
    }

    struct TokenInfo {
        bool isSupported;
        AggregatorV3Interface priceFeed; // Chainlink price feed (token/USD)
        uint8 decimals; // Token decimals (6 for USDC, 18 for WETH, etc.)
    }

    mapping(address => mapping(uint256 => Listing)) private s_listings;
    mapping(address => mapping(address => uint256)) private s_proceeds;
    mapping(address => TokenInfo) private s_supportedTokens;

    address private immutable i_owner;
    address public constant NATIVE_TOKEN = address(0); // Represents ETH

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        address paymentToken
    );

    event ItemCanceled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId);

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        address paymentToken
    );

    event TokenAdded(address indexed token, address indexed priceFeed, uint8 decimals);

    event TokenRemoved(address indexed token);

    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Not contract owner");
        _;
    }

    modifier isTokenSupported(address token) {
        if (!s_supportedTokens[token].isSupported) {
            revert NftMarketplace__TokenNotSupported();
        }
        _;
    }

    constructor(address ethPriceFeed) {
        i_owner = msg.sender;

        // Add native ETH support by default
        s_supportedTokens[NATIVE_TOKEN] = TokenInfo({
            isSupported: true,
            priceFeed: AggregatorV3Interface(ethPriceFeed),
            decimals: 18
        });
    }

    /////////////////////
    // Main Functions //
    /////////////////////

    /*
     * @notice Method for listing NFT on the marketplace
     * @param nftAddress: Address of NFT contract
     * @param tokenId: Token ID of NFT
     * @param price: Price in the payment token (with token decimals)
     * @param paymentToken Token seller wants to receive (use address(0) for ETH)
     * @dev Technically, we could have the contract be the esctows for the NFTs but this way people can still hold their NFTs when listed.
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price,
        address paymentToken
    )
        external
        // TODO: HAVE THIS CONTRACT ACCEPT PAYMENT IN A SUBSET OF TOKENS AS WELL
        // HINT: USE CHAINLINK PRICE FEEDS TO CONVERT THE PRICE OF THE TOKENS BETWEEN EACHOTHER
        notListed(nftAddress, tokenId, msg.sender)
        isOwner(nftAddress, tokenId, msg.sender)
        isTokenSupported(paymentToken)
    {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }

        IERC721 nft = IERC721(nftAddress);

        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }

        s_listings[nftAddress][tokenId] = Listing(price, msg.sender, paymentToken);

        emit ItemListed(msg.sender, nftAddress, tokenId, price, paymentToken);
    }

    /*
     * @notice Method for cancelling listing
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     */
    function cancelListing(
        address nftAddress,
        uint256 tokenId
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        delete (s_listings[nftAddress][tokenId]);

        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    /*
     * @notice Method for buying listing
     * @notice The owner of an NFT could unapprove the marketplace,
     * which would cause this function to fail
     * Ideally you'd also have a `createOffer` functionality.
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     */
    function buyItem(
        address nftAddress,
        uint256 tokenId,
        address paymentToken
    ) external payable isListed(nftAddress, tokenId) nonReentrant {
        // Challenge - How would you refactor this contract to take:
        // 1. Abitrary tokens as payment? (HINT - Chainlink Price Feeds!)
        // 2. Be able to set prices in other currencies?
        // 3. Tweet me @PatrickAlphaC if you come up with a solution!
        Listing memory listedItem = s_listings[nftAddress][tokenId];

        // Calculate required payment amount in buyer's chosen token
        uint256 requiredAmount = listedItem.paymentToken == paymentToken
            ? listedItem.price
            : PriceConverter.convertPrice(
                listedItem.price,
                s_supportedTokens[listedItem.paymentToken].priceFeed,
                s_supportedTokens[listedItem.paymentToken].decimals,
                s_supportedTokens[paymentToken].priceFeed,
                s_supportedTokens[paymentToken].decimals
            );

        // Handle payment
        if (paymentToken == NATIVE_TOKEN) {
            // Paying with ETH
            if (msg.value < requiredAmount) {
                revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price);
            }

            // Convert to seller's preferred token if needed
            if (listedItem.paymentToken == NATIVE_TOKEN) {
                s_proceeds[listedItem.seller][NATIVE_TOKEN] += msg.value;
            } else {
                // In production, you'd need a DEX integration here
                // For now, we'll require same token
                revert NftMarketplace__TokenNotSupported();
            }
        } else {
            // Paying with ERC20
            IERC20 token = IERC20(paymentToken);

            // Transfer tokens from buyer to contract
            bool success = token.transferFrom(msg.sender, address(this), requiredAmount);

            if (!success) {
                revert NftMarketplace__TransferFailed();
            }

            // Add to seller's proceeds
            s_proceeds[listedItem.seller][paymentToken] += requiredAmount;
        }
        // Could just send the money...
        // https://fravoll.github.io/solidity-patterns/pull_over_push.html
        delete (s_listings[nftAddress][tokenId]);

        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId);

        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price, paymentToken);
    }

    /*
     * @notice Method for updating listing
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     * @param newPrice Price in Wei of the item
     */
    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice,
        address newPaymentToken
    )
        external
        isListed(nftAddress, tokenId)
        nonReentrant
        isOwner(nftAddress, tokenId, msg.sender)
        isTokenSupported(newPaymentToken)
    {
        if (newPrice <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }

        s_listings[nftAddress][tokenId].price = newPrice;
        s_listings[nftAddress][tokenId].paymentToken = newPaymentToken;

        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice, newPaymentToken);
    }

    /*
     * @notice Method for withdrawing proceeds from sales
     */
    function withdrawProceeds(address token) external nonReentrant {
        uint256 proceeds = s_proceeds[msg.sender][token];

        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }

        s_proceeds[msg.sender][token] = 0;

        if (token == NATIVE_TOKEN) {
            (bool success, ) = payable(msg.sender).call{value: proceeds}("");

            if (!success) {
                revert NftMarketplace__TransferFailed();
            }
        } else {
            bool success = IERC20(token).transfer(msg.sender, proceeds);

            if (!success) {
                revert NftMarketplace__TransferFailed();
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Add support for a new payment token
     * @param token Token address (use address(0) for ETH)
     * @param priceFeed Chainlink price feed for token/USD
     * @param decimals Token decimals
     */
    function addSupportedToken(address token, address priceFeed, uint8 decimals) external onlyOwner {
        s_supportedTokens[token] = TokenInfo({
            isSupported: true,
            priceFeed: AggregatorV3Interface(priceFeed),
            decimals: decimals
        });

        emit TokenAdded(token, priceFeed, decimals);
    }

    /**
     * @notice Remove support for a payment token
     */
    function removeSupportedToken(address token) external onlyOwner {
        s_supportedTokens[token].isSupported = false;

        emit TokenRemoved(token);
    }

    /////////////////////
    // Getter Functions //
    /////////////////////

    function getListing(address nftAddress, uint256 tokenId) external view returns (Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller, address token) external view returns (uint256) {
        return s_proceeds[seller][token];
    }

    function isTokenSupportedPublic(address token) external view returns (bool) {
        return s_supportedTokens[token].isSupported;
    }

    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        return s_supportedTokens[token];
    }
}
