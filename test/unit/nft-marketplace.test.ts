import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, ethers } from "hardhat";
import hre from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { NftMarketplace, BasicNft, MockERC20 } from "../../typechain-types";
import MocksModule from "../../ignition/modules/mock";
import NftMarketPlaceModule from "../../ignition/modules/nft-marketplace";
import BasicNftModule from "../../ignition/modules/basic-nft";
import MockErc20Module from "../../ignition/modules/mock-erc20";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
          let nftMarketplace: NftMarketplace,
              nftMarketplaceContract: NftMarketplace,
              basicNft: BasicNft,
              mockUsdc: MockERC20;

          const PRICE = ethers.parseEther("1");

          const TOKEN_ID = 0;

          const NATIVE_TOKEN = ethers.ZeroAddress;

          let deployer: SignerWithAddress;

          let user1: SignerWithAddress;

          let user2: SignerWithAddress;

          let priceFeedAddress: string;

          let USDC: string;

          let usdcPriceFeed: string;

          const USDC_PRICE = 1000_000000n;

          const ETH_USD_PRICE = 4000_00000000n; // $4000
          const USDC_USD_PRICE = 1_00000000n; // $1

          beforeEach(async () => {
              const accounts = await ethers.getSigners();

              deployer = accounts[0];

              user1 = accounts[1];

              user2 = accounts[2];

              // Deploy BasicNFT
              const basicNftDeployed =
                  await hre.ignition.deploy(BasicNftModule);

              const basicNFT = basicNftDeployed.basicNft;

              const basicNftAddress = await basicNFT.getAddress();
              basicNft = (await ethers.getContractAt(
                  "BasicNft",
                  basicNftAddress,
              )) as BasicNft;

              // Deploy Mocks (Price Feeds)
              const mocks = await hre.ignition.deploy(MocksModule);

              priceFeedAddress = await mocks.ethPriceFeed.getAddress();

              usdcPriceFeed = await mocks.usdcPriceFeed.getAddress();

              // Deploy MockERC20 (USDC)
              const mockErc20Deployed = await hre.ignition.deploy(
                  MockErc20Module,
                  {
                      parameters: {
                          MockErc20Module: {
                              name: "USD Coin",
                              symbol: "USDC",
                              decimals: 6,
                          },
                      },
                  },
              );

              const mockERC20 = mockErc20Deployed.mockErc20;

              const mockErc20Address = await mockERC20.getAddress();

              mockUsdc = (await ethers.getContractAt(
                  "MockERC20",
                  mockErc20Address,
              )) as MockERC20;

              // Set USDC address for use in tests
              USDC = mockErc20Address;

              // Deploy NFT Marketplace
              const nftMarketplaceDeployed = await hre.ignition.deploy(
                  NftMarketPlaceModule,
                  {
                      parameters: {
                          NFTMarketPlaceModule: {
                              priceFeed: priceFeedAddress,
                          },
                      },
                  },
              );

              const nftMarketPlace = nftMarketplaceDeployed.nftMarketPlace;

              const nftMarketPlaceAddress = await nftMarketPlace.getAddress();

              nftMarketplaceContract = (await ethers.getContractAt(
                  "NftMarketplace",
                  nftMarketPlaceAddress,
              )) as NftMarketplace;
              nftMarketplace = nftMarketplaceContract.connect(deployer);

              // Setup: Mint NFT and approve marketplace
              await basicNft.connect(deployer).mintNft();

              await basicNft
                  .connect(deployer)
                  .approve(nftMarketPlaceAddress, TOKEN_ID);

              // Add USDC support to marketplace
              await nftMarketplace.addSupportedToken(USDC, usdcPriceFeed, 6);

              // Mint USDC to buyer
              await mockUsdc.mint(user1.address, ethers.parseUnits("10000", 6));
          });

          // ============================================================================
          // SETUP & CONSTRUCTOR
          // ============================================================================

          describe("Constructor", function () {
              it("initializes with contract owner", async function () {
                  const owner = await nftMarketplace.getOwner();

                  assert.equal(owner, deployer.address);
              });

              it("sets up native ETH token support by default", async function () {
                  const isSupported =
                      await nftMarketplace.isTokenSupportedPublic(NATIVE_TOKEN);

                  expect(isSupported).to.be.true;
              });

              it("correctly configures ETH price feed", async function () {
                  const tokenInfo =
                      await nftMarketplace.getTokenInfo(NATIVE_TOKEN);

                  assert.equal(tokenInfo.priceFeed, priceFeedAddress);

                  assert.equal(tokenInfo.decimals, BigInt(18));
              });
          });

          // ============================================================================
          // TOKEN MANAGEMENT
          // ============================================================================

          describe("Token Management", () => {
              describe("addSupportedToken", () => {
                  it("allows owner to add new supported tokens", async function () {
                      // ACT: owner.addSupportedToken(USDC, usdcPriceFeed, 6)
                      await nftMarketplace.addSupportedToken(
                          USDC,
                          usdcPriceFeed,
                          6,
                      );

                      // ASSERT: isTokenSupported(USDC) == true
                      const isSupported =
                          await nftMarketplace.isTokenSupportedPublic(USDC);
                      expect(isSupported).to.be.true;

                      // ASSERT: getTokenInfo(USDC).decimals == 6
                      const tokenInfo = await nftMarketplace.getTokenInfo(USDC);
                      assert.equal(tokenInfo.decimals, BigInt(6));
                      assert.equal(tokenInfo.priceFeed, usdcPriceFeed);
                  });

                  it("reverts when non-owner tries to add tokens", async function () {
                      // HINT: Use .connect() to switch signer
                      await expect(
                          nftMarketplace
                              .connect(user1)
                              .addSupportedToken(USDC, usdcPriceFeed, 6),
                      ).to.be.revertedWith("Not contract owner");
                  });

                  it("emits TokenAdded event", async function () {
                      await expect(
                          nftMarketplace.addSupportedToken(
                              USDC,
                              usdcPriceFeed,
                              6,
                          ),
                      )
                          .to.emit(nftMarketplace, "TokenAdded")
                          .withArgs(USDC, usdcPriceFeed, 6);
                  });
              });

              describe("removeSupportedToken", () => {
                  it("allows owner to remove supported tokens", async function () {
                      await nftMarketplace.removeSupportedToken(USDC);

                      const isSupported =
                          await nftMarketplace.isTokenSupportedPublic(USDC);

                      expect(isSupported).to.be.false;
                  });

                  it("reverts when non-owner tries to remove tokens", async function () {
                      await expect(
                          nftMarketplace
                              .connect(user1)
                              .removeSupportedToken(USDC),
                      ).to.be.revertedWith("Not contract owner");
                  });

                  it("prevents NEW listings with removed token", async function () {
                      // Remove USDC support
                      await nftMarketplace.removeSupportedToken(USDC);

                      // ACT: Try to list with removed token

                      await expect(
                          nftMarketplace.listItem(
                              await basicNft.getAddress(),
                              TOKEN_ID,
                              1000,
                              USDC,
                          ),
                      ).to.be.revertedWithCustomError(
                          nftMarketplace,
                          "NftMarketplace__TokenNotSupported",
                      );
                  });

                  it("prevents buying with removed token", async function () {
                      await nftMarketplace.listItem(
                          await basicNft.getAddress(),
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      );

                      // Remove USDC support
                      await nftMarketplace.removeSupportedToken(USDC);

                      // ACT: Try to list with removed token
                      await expect(
                          nftMarketplace
                              .connect(user1)
                              .buyItem(basicNft.getAddress(), TOKEN_ID, USDC),
                      ).to.be.revertedWithCustomError(
                          nftMarketplace,
                          "NftMarketplace__TokenNotSupported",
                      );
                  });
              });
          });

          // ============================================================================
          // LISTING
          // ============================================================================

          describe("listItem", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  // Store it once
                  nftAddress = await basicNft.getAddress();

                  // Mint and approve
                  await basicNft.mintNft();
              });

              it("lists NFT with correct price and payment token", async function () {
                  await basicNft.approve(
                      await nftMarketplace.getAddress(),
                      TOKEN_ID,
                  );

                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  const listingInfo = await nftMarketplace.getListing(
                      nftAddress,
                      TOKEN_ID,
                  );

                  assert.equal(listingInfo.price, PRICE);
                  assert.equal(listingInfo.seller, deployer.address);
                  assert.equal(listingInfo.paymentToken, NATIVE_TOKEN);
              });

              it("reverts if price is zero", async function () {
                  let price = 0n;

                  await expect(
                      nftMarketplace.listItem(
                          await basicNft.getAddress(),
                          TOKEN_ID,
                          price,
                          NATIVE_TOKEN,
                      ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero",
                  );
              });

              it("reverts if not approved", async function () {
                  const UNAPPROVED_TOKEN_ID = 1;

                  await expect(
                      nftMarketplace.listItem(
                          nftAddress,
                          UNAPPROVED_TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotApprovedForMarketplace",
                  );
              });

              it("reverts if not owner", async function () {
                  await basicNft.connect(user1).mintNft();

                  await expect(
                      nftMarketplace
                          .connect(user2)
                          .listItem(nftAddress, TOKEN_ID, PRICE, NATIVE_TOKEN),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotOwner",
                  );
              });

              it("reverts if already listed", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  await expect(
                      nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__AlreadyListed",
                  );
              });

              it("emits ItemListed event", async function () {
                  await expect(
                      nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      ),
                  )
                      .to.emit(nftMarketplace, "ItemListed")
                      .withArgs(
                          deployer.address,
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      );
              });
          });

          // ============================================================================
          // BUYING - SAME TOKEN
          // ============================================================================

          describe("buyItem - Same Token Payment", () => {
              let nftAddress: string;

              let nftMarketPlaceAddress: string;

              beforeEach(async function () {
                  // Store it once
                  nftAddress = await basicNft.getAddress();

                  nftMarketPlaceAddress = await nftMarketplace.getAddress();
              });

              it("allows buying with ETH when listed in ETH", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  await nftMarketplace
                      .connect(user2)
                      .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                          value: PRICE,
                      });

                  // ASSERT: NFT owner is now the buyer
                  const newOwner = await basicNft.ownerOf(TOKEN_ID);
                  assert.equal(newOwner, user2.address);

                  // ASSERT: Seller has proceeds in ETH
                  const sellerProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  assert.equal(sellerProceeds, PRICE);

                  // ASSERT: Listing is deleted
                  const listing = await nftMarketplace.getListing(
                      nftAddress,
                      TOKEN_ID,
                  );
                  assert.equal(listing.price, 0n);
              });

              it("allows buying with ERC20 when listed in same ERC20", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  await mockUsdc
                      .connect(user1)
                      .approve(nftMarketPlaceAddress, USDC_PRICE);

                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, USDC);

                  expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(
                      user1.address,
                  );
                  expect(
                      await nftMarketplace.getProceeds(deployer.address, USDC),
                  ).to.equal(USDC_PRICE);
              });

              it("reverts if ETH amount sent is insufficient", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  await expect(
                      nftMarketplace
                          .connect(user2)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: PRICE / 2n,
                          }),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceNotMet",
                  );
              });

              it("reverts if ERC20 allowance is insufficient", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // Approve only half the needed amount
                  await mockUsdc
                      .connect(user1)
                      .approve(nftMarketPlaceAddress, USDC_PRICE / 2n);

                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, USDC),
                  ).to.be.reverted;
              });

              it("reverts if ERC20 balance is insufficient", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // user2 has no USDC, but approve anyway
                  await mockUsdc
                      .connect(user2)
                      .approve(nftMarketPlaceAddress, USDC_PRICE);

                  await expect(
                      nftMarketplace
                          .connect(user2)
                          .buyItem(nftAddress, TOKEN_ID, USDC),
                  ).to.be.reverted;
              });
          });

          // ============================================================================
          // BUYING - CROSS TOKEN (CHAINLINK CONVERSION)
          // ============================================================================

          describe("buyItem - Cross Token Payment", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  nftAddress = await basicNft.getAddress();
              });

              it("allows buying with ETH when listed in USDC", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  const expectedEthAmount =
                      (USDC_PRICE * 10n ** 18n * USDC_USD_PRICE) /
                      (ETH_USD_PRICE * 10n ** 6n);

                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                          value: expectedEthAmount,
                      });

                  expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(
                      user1.address,
                  );

                  // Seller receives ETH, not USDC
                  const proceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  expect(proceeds).to.equal(expectedEthAmount);
              });

              it("allows buying with USDC when listed in ETH", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  const expectedUsdcAmount =
                      (PRICE * ETH_USD_PRICE) / (USDC_USD_PRICE * 10n ** 12n);

                  await mockUsdc
                      .connect(user1)
                      .approve(
                          await nftMarketplace.getAddress(),
                          expectedUsdcAmount,
                      );

                  const user1UsdcBefore = await mockUsdc.balanceOf(
                      user1.address,
                  );

                  // ACT: Buy with USDC
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, USDC);

                  // ASSERT: NFT owner is buyer
                  expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(
                      user1.address,
                  );

                  // ASSERT: Seller proceeds in USDC, NOT ETH
                  const sellerUsdcProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      USDC,
                  );
                  expect(sellerUsdcProceeds).to.equal(expectedUsdcAmount);

                  const sellerEthProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  expect(sellerEthProceeds).to.equal(0n);

                  // ASSERT: Buyer USDC decreased
                  const user1UsdcAfter = await mockUsdc.balanceOf(
                      user1.address,
                  );
                  expect(user1UsdcBefore - user1UsdcAfter).to.equal(
                      expectedUsdcAmount,
                  );
              });

              it("handles different decimal tokens correctly (6 vs 18)", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  const expectedUsdcAmount =
                      (PRICE * ETH_USD_PRICE) / (USDC_USD_PRICE * 10n ** 12n);

                  // Approve marketplace to spend USDC
                  await mockUsdc
                      .connect(user1)
                      .approve(
                          await nftMarketplace.getAddress(),
                          expectedUsdcAmount,
                      );

                  const user1UsdcBefore = await mockUsdc.balanceOf(
                      user1.address,
                  );

                  // ACT: Buy with USDC
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, USDC);

                  // ASSERT: NFT owner is buyer
                  expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(
                      user1.address,
                  );

                  // ASSERT: Seller proceeds in USDC, NOT ETH
                  const sellerUsdcProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      USDC,
                  );
                  expect(sellerUsdcProceeds).to.equal(expectedUsdcAmount);

                  const sellerEthProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  expect(sellerEthProceeds).to.equal(0n);

                  // ASSERT: Buyer USDC decreased
                  const user1UsdcAfter = await mockUsdc.balanceOf(
                      user1.address,
                  );
                  expect(user1UsdcBefore - user1UsdcAfter).to.equal(
                      expectedUsdcAmount,
                  );
              });

              it("reverts if converted amount is insufficient", async function () {
                  // ARRANGE: List for 1000 USDC
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // Get required ETH amount
                  const requiredEth =
                      await nftMarketplace.getListingPriceInToken(
                          nftAddress,
                          TOKEN_ID,
                          NATIVE_TOKEN,
                      );

                  // ACT & ASSERT: Send insufficient ETH
                  const insufficientAmount =
                      requiredEth - ethers.parseEther("0.1");

                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: insufficientAmount,
                          }),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceNotMet",
                  );
              });

              it("stores proceeds in buyer's payment token, not listing token", async function () {
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // Get required ETH
                  const requiredEth =
                      await nftMarketplace.getListingPriceInToken(
                          nftAddress,
                          TOKEN_ID,
                          NATIVE_TOKEN,
                      );

                  // ACT: Buy with ETH (cross-token payment)
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                          value: requiredEth,
                      });

                  // ASSERT: Seller has ETH proceeds, NOT USDC
                  const sellerEthProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      NATIVE_TOKEN,
                  );
                  expect(sellerEthProceeds).to.be.gt(0n);
                  expect(sellerEthProceeds).to.equal(requiredEth);

                  const sellerUsdcProceeds = await nftMarketplace.getProceeds(
                      deployer.address,
                      USDC,
                  );
                  expect(sellerUsdcProceeds).to.equal(0n);
              });
          });

          // ============================================================================
          // BUYING - EDGE CASES
          // ============================================================================

          describe("buyItem - Edge Cases", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  nftAddress = await basicNft.getAddress();
              });

              it("reverts if NFT not listed", async function () {
                  const UNLISTED_TOKEN_ID = 999;

                  // ACT & ASSERT: Try to buy unlisted NFT
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(
                              nftAddress,
                              UNLISTED_TOKEN_ID,
                              NATIVE_TOKEN,
                              {
                                  value: PRICE,
                              },
                          ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotListed",
                  );
              });

              it("reverts when trying to buy with unsupported token", async function () {
                  // ARRANGE: List NFT in ETH
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  const RANDOM_UNSUPPORTED_TOKEN =
                      "0x1234567890123456789012345678901234567890";

                  // ACT & ASSERT: Try to buy with unsupported token
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(
                              nftAddress,
                              TOKEN_ID,
                              RANDOM_UNSUPPORTED_TOKEN,
                          ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__TokenNotSupported",
                  );
              });

              it("handles NFT transfer after listing (seller no longer owns)", async function () {
                  // ARRANGE: List NFT
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  // Transfer NFT away from seller
                  await basicNft
                      .connect(deployer)
                      .transferFrom(deployer.address, user2.address, TOKEN_ID);

                  // ACT & ASSERT: Buyer tries to buy (should fail because seller no longer owns it)
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: PRICE,
                          }),
                  ).to.be.reverted; // safeTransferFrom will fail
              });

              it("handles approval removal after listing", async function () {
                  // ARRANGE: List NFT
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  // Remove marketplace approval
                  await basicNft
                      .connect(deployer)
                      .approve(ethers.ZeroAddress, TOKEN_ID);

                  // ACT & ASSERT: Buyer tries to buy (should fail due to no approval)
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: PRICE,
                          }),
                  ).to.be.reverted; // safeTransferFrom will fail due to no approval
              });

              it("emits ItemBought event with correct payment token", async function () {
                  // ARRANGE: List NFT in USDC
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // Get required ETH amount
                  const requiredEth =
                      await nftMarketplace.getListingPriceInToken(
                          nftAddress,
                          TOKEN_ID,
                          NATIVE_TOKEN,
                      );

                  // ACT & ASSERT: Buy with ETH and check event
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: requiredEth,
                          }),
                  )
                      .to.emit(nftMarketplace, "ItemBought")
                      .withArgs(
                          user1.address, // buyer
                          nftAddress, // nftAddress
                          TOKEN_ID, // tokenId
                          requiredEth, // price (in buyer's token)
                          NATIVE_TOKEN, // paymentToken (buyer's token, not listing token!)
                      );
              });
          });

          // ============================================================================
          // UPDATE LISTING
          // ============================================================================

          describe("updateListing", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  nftAddress = await basicNft.getAddress();
                  // List NFT first
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );
              });

              it("updates price and payment token", async function () {
                  const newPrice = ethers.parseUnits("2000", 6); // 2000 USDC

                  // ACT: Update listing
                  await nftMarketplace.updateListing(
                      nftAddress,
                      TOKEN_ID,
                      newPrice,
                      USDC,
                  );

                  // ASSERT: Listing updated
                  const listing = await nftMarketplace.getListing(
                      nftAddress,
                      TOKEN_ID,
                  );
                  expect(listing.price).to.equal(newPrice);
                  expect(listing.paymentToken).to.equal(USDC);
              });

              it("reverts if not owner", async function () {
                  // ACT & ASSERT: Non-owner tries to update
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .updateListing(
                              nftAddress,
                              TOKEN_ID,
                              PRICE * 2n,
                              NATIVE_TOKEN,
                          ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotOwner",
                  );
              });

              it("reverts if not listed", async function () {
                  const UNLISTED_TOKEN_ID = 999;

                  // ACT & ASSERT: Try to update unlisted NFT
                  await expect(
                      nftMarketplace.updateListing(
                          nftAddress,
                          UNLISTED_TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotListed",
                  );
              });

              it("reverts if new price is zero", async function () {
                  // ACT & ASSERT: Try to update with zero price
                  await expect(
                      nftMarketplace.updateListing(
                          nftAddress,
                          TOKEN_ID,
                          0,
                          NATIVE_TOKEN,
                      ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero",
                  );
              });

              it("reverts when updating to unsupported token", async function () {
                  const UNSUPPORTED_TOKEN =
                      "0x1234567890123456789012345678901234567890";

                  // ACT & ASSERT: Try to update to unsupported token
                  await expect(
                      nftMarketplace.updateListing(
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          UNSUPPORTED_TOKEN,
                      ),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__TokenNotSupported",
                  );
              });

              it("emits ItemListed event after update", async function () {
                  const newPrice = PRICE * 2n;

                  // ACT & ASSERT: Update and check event
                  await expect(
                      nftMarketplace.updateListing(
                          nftAddress,
                          TOKEN_ID,
                          newPrice,
                          NATIVE_TOKEN,
                      ),
                  )
                      .to.emit(nftMarketplace, "ItemListed")
                      .withArgs(
                          deployer.address,
                          nftAddress,
                          TOKEN_ID,
                          newPrice,
                          NATIVE_TOKEN,
                      );
              });
          });

          // ============================================================================
          // CANCEL LISTING
          // ============================================================================

          describe("cancelListing", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  nftAddress = await basicNft.getAddress();
                  // List NFT first
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );
              });

              it("allows owner to cancel listing", async function () {
                  // ACT: Cancel listing
                  await nftMarketplace.cancelListing(nftAddress, TOKEN_ID);

                  // ASSERT: Listing deleted
                  const listing = await nftMarketplace.getListing(
                      nftAddress,
                      TOKEN_ID,
                  );
                  expect(listing.price).to.equal(0n);
              });

              it("reverts if not owner", async function () {
                  // ACT & ASSERT: Non-owner tries to cancel
                  await expect(
                      nftMarketplace
                          .connect(user1)
                          .cancelListing(nftAddress, TOKEN_ID),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotOwner",
                  );
              });

              it("reverts if not listed", async function () {
                  // First mint the NFT so we can pass the isOwner check
                  await basicNft.mintNft(); // This will be token ID 1

                  // ACT & ASSERT: Try to cancel unlisted NFT (owner of unminted token)
                  // This will fail with NotOwner because token 999 doesn't exist
                  // Let's use token 1 which exists but isn't listed
                  await expect(
                      nftMarketplace.cancelListing(nftAddress, 1),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotListed",
                  );
              });

              it("emits ItemCanceled event", async function () {
                  // ACT & ASSERT: Cancel and check event
                  await expect(
                      nftMarketplace.cancelListing(nftAddress, TOKEN_ID),
                  )
                      .to.emit(nftMarketplace, "ItemCanceled")
                      .withArgs(deployer.address, nftAddress, TOKEN_ID);
              });

              it("allows relisting after cancellation", async function () {
                  // ARRANGE: Cancel listing
                  await nftMarketplace.cancelListing(nftAddress, TOKEN_ID);

                  // ACT: List again
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  // ASSERT: Successfully relisted
                  const listing = await nftMarketplace.getListing(
                      nftAddress,
                      TOKEN_ID,
                  );
                  expect(listing.price).to.equal(PRICE);
              });
          });

          // ============================================================================
          // WITHDRAW PROCEEDS
          // ============================================================================

          describe("withdrawProceeds", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  nftAddress = await basicNft.getAddress();
              });

              it("allows seller to withdraw ETH proceeds", async function () {
                  // ARRANGE: Sell NFT for ETH
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );

                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                          value: PRICE,
                      });

                  const sellerBalanceBefore = await ethers.provider.getBalance(
                      deployer.address,
                  );

                  // ACT: Withdraw proceeds
                  const tx =
                      await nftMarketplace.withdrawProceeds(NATIVE_TOKEN);
                  const receipt = await tx.wait();
                  const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

                  const sellerBalanceAfter = await ethers.provider.getBalance(
                      deployer.address,
                  );

                  // ASSERT: Balance increased by PRICE minus gas
                  expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(
                      PRICE - gasUsed,
                  );

                  // ASSERT: Proceeds reset to 0
                  expect(
                      await nftMarketplace.getProceeds(
                          deployer.address,
                          NATIVE_TOKEN,
                      ),
                  ).to.equal(0n);
              });

              it("allows seller to withdraw ERC20 proceeds", async function () {
                  // ARRANGE: Sell NFT for USDC
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  await mockUsdc
                      .connect(user1)
                      .approve(await nftMarketplace.getAddress(), USDC_PRICE);

                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, USDC);

                  const sellerUsdcBefore = await mockUsdc.balanceOf(
                      deployer.address,
                  );

                  // ACT: Withdraw proceeds
                  await nftMarketplace.withdrawProceeds(USDC);

                  const sellerUsdcAfter = await mockUsdc.balanceOf(
                      deployer.address,
                  );

                  // ASSERT: USDC balance increased
                  expect(sellerUsdcAfter - sellerUsdcBefore).to.equal(
                      USDC_PRICE,
                  );

                  // ASSERT: Proceeds reset to 0
                  expect(
                      await nftMarketplace.getProceeds(deployer.address, USDC),
                  ).to.equal(0n);
              });

              it("reverts if no proceeds", async function () {
                  // ACT & ASSERT: Try to withdraw with no proceeds
                  await expect(
                      nftMarketplace.withdrawProceeds(NATIVE_TOKEN),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NoProceeds",
                  );
              });

              it("allows withdrawing different tokens separately", async function () {
                  // ARRANGE: Mint and approve second NFT
                  await basicNft.mintNft();
                  const TOKEN_ID_2 = 1;
                  await basicNft.approve(
                      await nftMarketplace.getAddress(),
                      TOKEN_ID_2,
                  );

                  // Sell NFT1 for ETH
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      PRICE,
                      NATIVE_TOKEN,
                  );
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                          value: PRICE,
                      });

                  // Sell NFT2 for USDC
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID_2,
                      USDC_PRICE,
                      USDC,
                  );
                  await mockUsdc
                      .connect(user1)
                      .approve(await nftMarketplace.getAddress(), USDC_PRICE);
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID_2, USDC);

                  // ACT: Withdraw ETH
                  await nftMarketplace.withdrawProceeds(NATIVE_TOKEN);

                  // ASSERT: ETH withdrawn, USDC unchanged
                  expect(
                      await nftMarketplace.getProceeds(
                          deployer.address,
                          NATIVE_TOKEN,
                      ),
                  ).to.equal(0n);
                  expect(
                      await nftMarketplace.getProceeds(deployer.address, USDC),
                  ).to.equal(USDC_PRICE);

                  // ACT: Withdraw USDC
                  await nftMarketplace.withdrawProceeds(USDC);

                  // ASSERT: USDC withdrawn
                  expect(
                      await nftMarketplace.getProceeds(deployer.address, USDC),
                  ).to.equal(0n);
              });
          });

          // ============================================================================
          // VIEW FUNCTIONS
          // ============================================================================

          describe("View Functions", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  nftAddress = await basicNft.getAddress();
              });

              describe("getListing", () => {
                  it("returns correct listing information", async function () {
                      // ARRANGE: List NFT for USDC
                      await nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          USDC_PRICE,
                          USDC,
                      );

                      // ACT: Get listing
                      const listing = await nftMarketplace.getListing(
                          nftAddress,
                          TOKEN_ID,
                      );

                      // ASSERT: Correct info returned
                      expect(listing.price).to.equal(USDC_PRICE);
                      expect(listing.seller).to.equal(deployer.address);
                      expect(listing.paymentToken).to.equal(USDC);
                  });

                  it("returns zero price for unlisted items", async function () {
                      const UNLISTED_TOKEN_ID = 999;

                      // ACT: Get unlisted item
                      const listing = await nftMarketplace.getListing(
                          nftAddress,
                          UNLISTED_TOKEN_ID,
                      );

                      // ASSERT: Price is zero
                      expect(listing.price).to.equal(0n);
                  });
              });

              describe("getProceeds", () => {
                  it("returns correct proceeds for each token", async function () {
                      // ARRANGE: Mint second NFT
                      await basicNft.mintNft();
                      const TOKEN_ID_2 = 1;
                      await basicNft.approve(
                          await nftMarketplace.getAddress(),
                          TOKEN_ID_2,
                      );

                      // Sell for ETH
                      await nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      );
                      await nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                              value: PRICE,
                          });

                      // Sell for USDC
                      await nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID_2,
                          USDC_PRICE,
                          USDC,
                      );
                      await mockUsdc
                          .connect(user1)
                          .approve(
                              await nftMarketplace.getAddress(),
                              USDC_PRICE,
                          );
                      await nftMarketplace
                          .connect(user1)
                          .buyItem(nftAddress, TOKEN_ID_2, USDC);

                      // ACT & ASSERT: Check proceeds
                      expect(
                          await nftMarketplace.getProceeds(
                              deployer.address,
                              NATIVE_TOKEN,
                          ),
                      ).to.equal(PRICE);
                      expect(
                          await nftMarketplace.getProceeds(
                              deployer.address,
                              USDC,
                          ),
                      ).to.equal(USDC_PRICE);
                  });

                  it("returns 0 for addresses with no proceeds", async function () {
                      // ACT & ASSERT: Random address has no proceeds
                      expect(
                          await nftMarketplace.getProceeds(
                              user2.address,
                              NATIVE_TOKEN,
                          ),
                      ).to.equal(0n);
                  });
              });

              describe("getListingPriceInToken", () => {
                  it("returns same price when target token matches listing token", async function () {
                      // ARRANGE: List for ETH

                      await nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      );

                      // ACT: Get price in ETH
                      const price = await nftMarketplace.getListingPriceInToken(
                          nftAddress,
                          TOKEN_ID,
                          NATIVE_TOKEN,
                      );

                      // ASSERT: Same price
                      expect(price).to.equal(PRICE);
                  });

                  it("correctly converts ETH price to USDC", async function () {
                      // ARRANGE: List for 1 ETH (ETH = $2000)

                      await nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      );

                      // ACT: Get price in USDC
                      const usdcPrice =
                          await nftMarketplace.getListingPriceInToken(
                              nftAddress,
                              TOKEN_ID,
                              USDC,
                          );

                      // ASSERT: 2000 USDC (with 6 decimals)
                      expect(usdcPrice).to.equal(ethers.parseUnits("4000", 6));
                  });

                  it("correctly converts USDC price to ETH", async function () {
                      // ARRANGE: List for 1000 USDC (ETH = $2000)
                      await nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          USDC_PRICE,
                          USDC,
                      );

                      // ACT: Get price in ETH
                      const ethPrice =
                          await nftMarketplace.getListingPriceInToken(
                              nftAddress,
                              TOKEN_ID,
                              NATIVE_TOKEN,
                          );

                      // ASSERT: 0.5 ETH (1000 / 2000)
                      expect(ethPrice).to.equal(ethers.parseEther("0.25"));
                  });

                  it("reverts if NFT not listed", async function () {
                      const UNLISTED_TOKEN_ID = 999;

                      // ACT & ASSERT
                      await expect(
                          nftMarketplace.getListingPriceInToken(
                              nftAddress,
                              UNLISTED_TOKEN_ID,
                              NATIVE_TOKEN,
                          ),
                      ).to.be.revertedWithCustomError(
                          nftMarketplace,
                          "NftMarketplace__NotListed",
                      );
                  });

                  it("reverts if target token not supported", async function () {
                      // ARRANGE: List NFT
                      await nftMarketplace.listItem(
                          nftAddress,
                          TOKEN_ID,
                          PRICE,
                          NATIVE_TOKEN,
                      );

                      const UNSUPPORTED_TOKEN =
                          "0x1234567890123456789012345678901234567890";

                      // ACT & ASSERT
                      await expect(
                          nftMarketplace.getListingPriceInToken(
                              nftAddress,
                              TOKEN_ID,
                              UNSUPPORTED_TOKEN,
                          ),
                      ).to.be.revertedWithCustomError(
                          nftMarketplace,
                          "NftMarketplace__TokenNotSupported",
                      );
                  });
              });
          });

          // ============================================================================
          // INTEGRATION TESTS
          // ============================================================================

          describe("Integration Tests", () => {
              let nftAddress: string;

              beforeEach(async function () {
                  nftAddress = await basicNft.getAddress();
              });

              it("complete flow: list in USDC, buy with ETH, withdraw ETH", async function () {
                  // ARRANGE: List for 1000 USDC
                  await nftMarketplace.listItem(
                      nftAddress,
                      TOKEN_ID,
                      USDC_PRICE,
                      USDC,
                  );

                  // Get required ETH (1000 USDC at $1 = $1000, ETH at $2000 = 0.5 ETH)
                  const requiredEth =
                      await nftMarketplace.getListingPriceInToken(
                          nftAddress,
                          TOKEN_ID,
                          NATIVE_TOKEN,
                      );

                  // ACT: Buy with ETH
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, TOKEN_ID, NATIVE_TOKEN, {
                          value: requiredEth,
                      });

                  // ASSERT: Buyer owns NFT
                  expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(
                      user1.address,
                  );

                  // ASSERT: Seller has ETH proceeds
                  expect(
                      await nftMarketplace.getProceeds(
                          deployer.address,
                          NATIVE_TOKEN,
                      ),
                  ).to.equal(requiredEth);

                  const sellerBalanceBefore = await ethers.provider.getBalance(
                      deployer.address,
                  );

                  // ACT: Withdraw ETH
                  const tx =
                      await nftMarketplace.withdrawProceeds(NATIVE_TOKEN);
                  const receipt = await tx.wait();
                  const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

                  const sellerBalanceAfter = await ethers.provider.getBalance(
                      deployer.address,
                  );

                  // ASSERT: Seller received ETH
                  expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(
                      requiredEth - gasUsed,
                  );
              });

              it("multiple buyers using different payment tokens for same listing type", async function () {
                  // ARRANGE: Mint 2 more NFTs
                  await basicNft.mintNft(); // TOKEN_ID 1
                  await basicNft.mintNft(); // TOKEN_ID 2

                  await basicNft.approve(await nftMarketplace.getAddress(), 1);
                  await basicNft.approve(await nftMarketplace.getAddress(), 2);

                  // List all 3 NFTs for 1000 USDC each
                  await nftMarketplace.listItem(
                      nftAddress,
                      0,
                      USDC_PRICE,
                      USDC,
                  );
                  await nftMarketplace.listItem(
                      nftAddress,
                      1,
                      USDC_PRICE,
                      USDC,
                  );
                  await nftMarketplace.listItem(
                      nftAddress,
                      2,
                      USDC_PRICE,
                      USDC,
                  );

                  // ACT: Buyer1 buys with USDC (same token)
                  await mockUsdc
                      .connect(user1)
                      .approve(await nftMarketplace.getAddress(), USDC_PRICE);
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, 0, USDC);

                  // ACT: Buyer2 buys with ETH (cross-token)
                  const requiredEth =
                      await nftMarketplace.getListingPriceInToken(
                          nftAddress,
                          1,
                          NATIVE_TOKEN,
                      );
                  await nftMarketplace
                      .connect(user2)
                      .buyItem(nftAddress, 1, NATIVE_TOKEN, {
                          value: requiredEth,
                      });

                  // ACT: User1 buys third with ETH too
                  await nftMarketplace
                      .connect(user1)
                      .buyItem(nftAddress, 2, NATIVE_TOKEN, {
                          value: requiredEth,
                      });

                  // ASSERT: Seller has proceeds in both tokens
                  expect(
                      await nftMarketplace.getProceeds(deployer.address, USDC),
                  ).to.equal(USDC_PRICE);
                  expect(
                      await nftMarketplace.getProceeds(
                          deployer.address,
                          NATIVE_TOKEN,
                      ),
                  ).to.equal(requiredEth * 2n); // Two ETH purchases
              });
          });
      });
