// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title KnowledgeBadges
 * @dev ERC-1155 badges for reading achievements
 *
 * Badge Types:
 * - Collection milestones (5, 10, 25, 50, 100 books)
 * - Topic mastery (Economics, Philosophy, etc.)
 * - Controversial badges (Censorship Survivor, Thought Criminal)
 * - Reading streaks and engagement
 */
contract KnowledgeBadges is ERC1155, Ownable {
    using Strings for uint256;

    // Badge metadata
    struct Badge {
        string name;
        string description;
        string category;        // 'milestone', 'topic', 'controversial', 'special'
        uint256 requiredBooks;  // Number of books needed (if applicable)
        string[] requiredBookIds; // Specific books needed (if applicable)
        string requirement;     // Human-readable requirement
        uint256 totalEarned;    // Total times this badge has been earned
        bool isActive;          // Can be earned?
    }

    // Badge registry
    mapping(uint256 => Badge) public badges;
    uint256 public nextBadgeId;

    // Track which badges users have earned
    mapping(address => mapping(uint256 => bool)) public hasEarnedBadge;

    // Track user's total badges
    mapping(address => uint256) public totalBadgesEarned;

    // Reference to BookOwnership contract
    address public bookOwnershipContract;

    // Events
    event BadgeCreated(
        uint256 indexed badgeId,
        string name,
        string category
    );

    event BadgeClaimed(
        address indexed user,
        uint256 indexed badgeId,
        string badgeName
    );

    event BadgeRevoked(
        address indexed user,
        uint256 indexed badgeId
    );

    constructor(string memory uri) ERC1155(uri) {
        // Create initial badge set
        _createInitialBadges();
    }

    /**
     * @dev Set the BookOwnership contract address
     */
    function setBookOwnershipContract(address _contract) public onlyOwner {
        bookOwnershipContract = _contract;
    }

    /**
     * @dev Create a new badge
     */
    function createBadge(
        string memory name,
        string memory description,
        string memory category,
        uint256 requiredBooks,
        string memory requirement
    ) public onlyOwner returns (uint256) {
        uint256 badgeId = nextBadgeId;
        nextBadgeId++;

        badges[badgeId] = Badge({
            name: name,
            description: description,
            category: category,
            requiredBooks: requiredBooks,
            requiredBookIds: new string[](0),
            requirement: requirement,
            totalEarned: 0,
            isActive: true
        });

        emit BadgeCreated(badgeId, name, category);
        return badgeId;
    }

    /**
     * @dev Claim a badge (called by backend after verification)
     */
    function claimBadge(address user, uint256 badgeId) public onlyOwner {
        require(badges[badgeId].isActive, "Badge is not active");
        require(!hasEarnedBadge[user][badgeId], "Badge already earned");

        _mint(user, badgeId, 1, "");
        hasEarnedBadge[user][badgeId] = true;
        badges[badgeId].totalEarned++;
        totalBadgesEarned[user]++;

        emit BadgeClaimed(user, badgeId, badges[badgeId].name);
    }

    /**
     * @dev Batch claim multiple badges
     */
    function claimBadgeBatch(address user, uint256[] memory badgeIds) public onlyOwner {
        for (uint256 i = 0; i < badgeIds.length; i++) {
            if (!hasEarnedBadge[user][badgeIds[i]] && badges[badgeIds[i]].isActive) {
                claimBadge(user, badgeIds[i]);
            }
        }
    }

    /**
     * @dev Get all badges earned by a user
     */
    function getBadgesOfUser(address user) public view returns (uint256[] memory) {
        uint256[] memory earnedBadges = new uint256[](totalBadgesEarned[user]);
        uint256 index = 0;

        for (uint256 i = 0; i < nextBadgeId; i++) {
            if (hasEarnedBadge[user][i]) {
                earnedBadges[index] = i;
                index++;
            }
        }

        return earnedBadges;
    }

    /**
     * @dev Get badge details
     */
    function getBadgeDetails(uint256 badgeId)
        public
        view
        returns (
            string memory name,
            string memory description,
            string memory category,
            uint256 requiredBooks,
            string memory requirement,
            uint256 totalEarned,
            bool isActive
        )
    {
        Badge memory badge = badges[badgeId];
        return (
            badge.name,
            badge.description,
            badge.category,
            badge.requiredBooks,
            badge.requirement,
            badge.totalEarned,
            badge.isActive
        );
    }

    /**
     * @dev Get user's badge statistics
     */
    function getUserBadgeStats(address user)
        public
        view
        returns (
            uint256 total,
            uint256 milestone,
            uint256 topic,
            uint256 controversial,
            uint256 special
        )
    {
        total = totalBadgesEarned[user];

        for (uint256 i = 0; i < nextBadgeId; i++) {
            if (hasEarnedBadge[user][i]) {
                string memory category = badges[i].category;

                if (keccak256(bytes(category)) == keccak256(bytes("milestone"))) {
                    milestone++;
                } else if (keccak256(bytes(category)) == keccak256(bytes("topic"))) {
                    topic++;
                } else if (keccak256(bytes(category)) == keccak256(bytes("controversial"))) {
                    controversial++;
                } else if (keccak256(bytes(category)) == keccak256(bytes("special"))) {
                    special++;
                }
            }
        }

        return (total, milestone, topic, controversial, special);
    }

    /**
     * @dev Create initial badge set
     */
    function _createInitialBadges() private {
        // Milestone badges
        createBadge(
            "First Book",
            "Purchased your first book",
            "milestone",
            1,
            "Own 1 book"
        );

        createBadge(
            "Reading Habit",
            "Building a library",
            "milestone",
            5,
            "Own 5 books"
        );

        createBadge(
            "Book Collector",
            "Serious reader",
            "milestone",
            10,
            "Own 10 books"
        );

        createBadge(
            "Library Builder",
            "Growing knowledge base",
            "milestone",
            25,
            "Own 25 books"
        );

        createBadge(
            "Scholar",
            "Dedicated to learning",
            "milestone",
            50,
            "Own 50 books"
        );

        createBadge(
            "Library Master",
            "Extensive collection",
            "milestone",
            100,
            "Own 100 books"
        );

        // Controversial badges
        createBadge(
            "Censorship Survivor",
            "Owner of banned knowledge",
            "controversial",
            5,
            "Own 5+ banned books"
        );

        createBadge(
            "Thought Criminal",
            "Dangerous knowledge collector",
            "controversial",
            25,
            "Own 25+ banned books"
        );

        createBadge(
            "Forbidden Library",
            "Master of suppressed knowledge",
            "controversial",
            50,
            "Own 50+ banned books"
        );

        // Topic badges (examples)
        createBadge(
            "Economics Scholar",
            "Master of economic theory",
            "topic",
            10,
            "Own 10+ economics books"
        );

        createBadge(
            "Philosophy Enthusiast",
            "Lover of wisdom",
            "topic",
            10,
            "Own 10+ philosophy books"
        );

        createBadge(
            "Privacy Advocate",
            "Champion of digital rights",
            "topic",
            10,
            "Own 10+ privacy/security books"
        );
    }

    /**
     * @dev Override URI to support dynamic metadata
     */
    function uri(uint256 badgeId) public view override returns (string memory) {
        require(badgeId < nextBadgeId, "Badge does not exist");

        // Return metadata URI
        return string(abi.encodePacked(
            super.uri(badgeId),
            badgeId.toString(),
            ".json"
        ));
    }

    /**
     * @dev Disable transfers (badges are soulbound - cannot be sold/transferred)
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override {
        require(from == address(0) || to == address(0), "Badges are soulbound and cannot be transferred");
        super.safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override {
        require(from == address(0) || to == address(0), "Badges are soulbound and cannot be transferred");
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }
}
