// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BookOwnership
 * @dev ERC-721 NFT for permanent, uncensorable book ownership
 *
 * Features:
 * - Mint NFT when user purchases book
 * - Store book content on IPFS
 * - Permanent proof of ownership
 * - Transferable (inheritance, gifting)
 * - Cannot be revoked or censored
 */
contract BookOwnership is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Book metadata structure
    struct Book {
        string ipfsHash;        // IPFS content hash (encrypted)
        string metadataHash;    // Arweave metadata hash
        uint256 purchaseDate;   // Timestamp of purchase
        string bookId;          // Original book ID from marketplace
        string brand;           // Brand/publisher
        bool isPrivate;         // Hidden from public view?
    }

    // Mapping from token ID to book data
    mapping(uint256 => Book) public books;

    // Mapping from book ID to all token IDs (track copies)
    mapping(string => uint256[]) public bookIdToTokens;

    // Mapping from user address to their library
    mapping(address => uint256[]) public userLibrary;

    // Events
    event BookMinted(
        address indexed owner,
        uint256 indexed tokenId,
        string bookId,
        string ipfsHash
    );

    event BookTransferred(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );

    event BookPrivacyUpdated(
        uint256 indexed tokenId,
        bool isPrivate
    );

    constructor() ERC721("Teneo Book Library", "BOOK") {}

    /**
     * @dev Mint a new book NFT
     * @param to Address to mint to
     * @param bookId Book identifier from marketplace
     * @param brand Brand/publisher name
     * @param ipfsHash IPFS hash of book content
     * @param metadataHash Arweave hash of metadata
     * @param tokenURI URI for token metadata
     */
    function mintBook(
        address to,
        string memory bookId,
        string memory brand,
        string memory ipfsHash,
        string memory metadataHash,
        string memory tokenURI
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        books[tokenId] = Book({
            ipfsHash: ipfsHash,
            metadataHash: metadataHash,
            purchaseDate: block.timestamp,
            bookId: bookId,
            brand: brand,
            isPrivate: false
        });

        bookIdToTokens[bookId].push(tokenId);
        userLibrary[to].push(tokenId);

        emit BookMinted(to, tokenId, bookId, ipfsHash);

        return tokenId;
    }

    /**
     * @dev Get all books owned by an address
     * @param owner Address to query
     * @return Array of token IDs
     */
    function getBooksOfOwner(address owner) public view returns (uint256[] memory) {
        return userLibrary[owner];
    }

    /**
     * @dev Get book details
     * @param tokenId Token ID to query
     * @return Book struct
     */
    function getBookDetails(uint256 tokenId) public view returns (Book memory) {
        require(_exists(tokenId), "Book does not exist");
        return books[tokenId];
    }

    /**
     * @dev Set book privacy (hide from public view)
     * @param tokenId Token ID
     * @param isPrivate Whether book should be private
     */
    function setBookPrivacy(uint256 tokenId, bool isPrivate) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        books[tokenId].isPrivate = isPrivate;
        emit BookPrivacyUpdated(tokenId, isPrivate);
    }

    /**
     * @dev Get total number of unique books in circulation
     * @return Total unique books
     */
    function getTotalUniqueBooks() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Get library statistics for a user
     * @param owner Address to query
     * @return totalBooks Total books owned
     * @return publicBooks Non-private books
     * @return oldestPurchase Timestamp of oldest book
     */
    function getLibraryStats(address owner)
        public
        view
        returns (
            uint256 totalBooks,
            uint256 publicBooks,
            uint256 oldestPurchase
        )
    {
        uint256[] memory tokens = userLibrary[owner];
        totalBooks = tokens.length;
        oldestPurchase = block.timestamp;

        for (uint256 i = 0; i < tokens.length; i++) {
            if (!books[tokens[i]].isPrivate) {
                publicBooks++;
            }
            if (books[tokens[i]].purchaseDate < oldestPurchase) {
                oldestPurchase = books[tokens[i]].purchaseDate;
            }
        }

        return (totalBooks, publicBooks, oldestPurchase);
    }

    // Override required by Solidity for ERC721URIStorage
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Override transfer hooks to update user libraries
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._afterTokenTransfer(from, to, tokenId, batchSize);

        if (from != address(0)) {
            // Remove from sender's library
            uint256[] storage fromLibrary = userLibrary[from];
            for (uint256 i = 0; i < fromLibrary.length; i++) {
                if (fromLibrary[i] == tokenId) {
                    fromLibrary[i] = fromLibrary[fromLibrary.length - 1];
                    fromLibrary.pop();
                    break;
                }
            }
        }

        if (to != address(0) && from != address(0)) {
            // Add to recipient's library
            userLibrary[to].push(tokenId);
            emit BookTransferred(from, to, tokenId);
        }
    }
}
