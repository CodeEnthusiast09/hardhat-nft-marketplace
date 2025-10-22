// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BasicNft is ERC721 {
    string public constant TOKEN_URI =
        "ipfs://bafkreib7vnqdrfs3pzz64w5vale65vkeubygpibpxh5ni7zeekb2kfg6xy/?filename=st-bernard.json";
    uint256 private s_tokenCounter;

    event DogMinted(uint256 indexed tokenId);

    constructor() ERC721("Dogie", "DOG") {
        s_tokenCounter = 0;
    }

    function mintNft() public {
        _safeMint(msg.sender, s_tokenCounter);
        emit DogMinted(s_tokenCounter);
        s_tokenCounter = s_tokenCounter + 1;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return TOKEN_URI;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
