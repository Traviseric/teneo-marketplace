// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IBookOwnership {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function getBooksOfOwner(address owner) external view returns (uint256[] memory);
}

/**
 * @title LibraryInheritance
 * @dev Simple inheritance protocol for book NFTs
 *
 * Features:
 * - Set beneficiaries for your library
 * - Time-locked release (after specific date)
 * - Multi-beneficiary support (split library)
 * - Revocable until execution
 * - Dead man's switch (auto-execute after inactivity)
 */
contract LibraryInheritance is Ownable {
    IBookOwnership public bookOwnership;

    struct InheritancePlan {
        address owner;
        address[] beneficiaries;
        uint256[] bookIds;          // Empty = all books
        uint256 releaseDate;        // Timestamp when can be executed
        uint256 lastHeartbeat;      // Last activity timestamp
        uint256 heartbeatInterval;  // Required check-in interval (seconds)
        bool isActive;
        bool isExecuted;
        string notes;               // Optional message to beneficiaries
    }

    mapping(address => InheritancePlan) public inheritancePlans;

    // Reverse lookup: beneficiary => list of plans they're in
    mapping(address => address[]) public beneficiaryPlans;

    event InheritancePlanCreated(
        address indexed owner,
        address[] beneficiaries,
        uint256 releaseDate
    );

    event InheritancePlanUpdated(
        address indexed owner,
        uint256 releaseDate
    );

    event HeartbeatReceived(
        address indexed owner,
        uint256 timestamp
    );

    event InheritanceExecuted(
        address indexed owner,
        address[] beneficiaries,
        uint256 timestamp
    );

    event InheritancePlanRevoked(
        address indexed owner
    );

    constructor(address _bookOwnershipContract) {
        bookOwnership = IBookOwnership(_bookOwnershipContract);
    }

    /**
     * @dev Create or update inheritance plan
     * @param beneficiaries List of addresses to inherit library
     * @param releaseDate Timestamp when plan can be executed
     * @param heartbeatIntervalDays Days between required check-ins (0 = disabled)
     * @param notes Message to beneficiaries
     */
    function createInheritancePlan(
        address[] memory beneficiaries,
        uint256 releaseDate,
        uint256 heartbeatIntervalDays,
        string memory notes
    ) public {
        require(beneficiaries.length > 0, "Must have at least one beneficiary");
        require(releaseDate > block.timestamp, "Release date must be in future");

        InheritancePlan storage plan = inheritancePlans[msg.sender];

        // Remove from old beneficiaries' lookup
        if (plan.owner != address(0)) {
            for (uint256 i = 0; i < plan.beneficiaries.length; i++) {
                _removeBeneficiaryPlan(plan.beneficiaries[i], msg.sender);
            }
        }

        plan.owner = msg.sender;
        plan.beneficiaries = beneficiaries;
        plan.bookIds = new uint256[](0); // Empty = all books
        plan.releaseDate = releaseDate;
        plan.lastHeartbeat = block.timestamp;
        plan.heartbeatInterval = heartbeatIntervalDays * 1 days;
        plan.isActive = true;
        plan.isExecuted = false;
        plan.notes = notes;

        // Add to new beneficiaries' lookup
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            beneficiaryPlans[beneficiaries[i]].push(msg.sender);
        }

        emit InheritancePlanCreated(msg.sender, beneficiaries, releaseDate);
    }

    /**
     * @dev Send heartbeat to delay automatic execution
     */
    function heartbeat() public {
        InheritancePlan storage plan = inheritancePlans[msg.sender];
        require(plan.isActive, "No active plan");
        require(!plan.isExecuted, "Plan already executed");

        plan.lastHeartbeat = block.timestamp;
        emit HeartbeatReceived(msg.sender, block.timestamp);
    }

    /**
     * @dev Check if plan can be executed
     */
    function canExecutePlan(address owner) public view returns (bool, string memory) {
        InheritancePlan memory plan = inheritancePlans[owner];

        if (!plan.isActive) {
            return (false, "Plan not active");
        }

        if (plan.isExecuted) {
            return (false, "Plan already executed");
        }

        // Check time-lock
        if (block.timestamp < plan.releaseDate) {
            // Check dead man's switch
            if (plan.heartbeatInterval > 0) {
                uint256 timeSinceHeartbeat = block.timestamp - plan.lastHeartbeat;
                if (timeSinceHeartbeat >= plan.heartbeatInterval) {
                    return (true, "Dead man's switch triggered");
                }
            }
            return (false, "Release date not reached and owner is active");
        }

        return (true, "Release date reached");
    }

    /**
     * @dev Execute inheritance plan
     * Can be called by beneficiary or anyone after conditions are met
     */
    function executeInheritance(address owner) public {
        InheritancePlan storage plan = inheritancePlans[owner];

        (bool canExecute, string memory reason) = canExecutePlan(owner);
        require(canExecute, reason);

        plan.isExecuted = true;
        plan.isActive = false;

        // Get all books owned by the deceased
        uint256[] memory books = bookOwnership.getBooksOfOwner(owner);

        // Distribute books to beneficiaries
        uint256 booksPerBeneficiary = books.length / plan.beneficiaries.length;
        uint256 currentBook = 0;

        for (uint256 i = 0; i < plan.beneficiaries.length; i++) {
            uint256 booksToTransfer = booksPerBeneficiary;

            // Last beneficiary gets remaining books
            if (i == plan.beneficiaries.length - 1) {
                booksToTransfer = books.length - currentBook;
            }

            for (uint256 j = 0; j < booksToTransfer && currentBook < books.length; j++) {
                bookOwnership.safeTransferFrom(
                    owner,
                    plan.beneficiaries[i],
                    books[currentBook]
                );
                currentBook++;
            }
        }

        emit InheritanceExecuted(owner, plan.beneficiaries, block.timestamp);
    }

    /**
     * @dev Revoke inheritance plan
     */
    function revokeInheritancePlan() public {
        InheritancePlan storage plan = inheritancePlans[msg.sender];
        require(plan.isActive, "No active plan");
        require(!plan.isExecuted, "Plan already executed");

        plan.isActive = false;

        // Remove from beneficiaries' lookup
        for (uint256 i = 0; i < plan.beneficiaries.length; i++) {
            _removeBeneficiaryPlan(plan.beneficiaries[i], msg.sender);
        }

        emit InheritancePlanRevoked(msg.sender);
    }

    /**
     * @dev Get inheritance plan details
     */
    function getInheritancePlan(address owner)
        public
        view
        returns (
            address[] memory beneficiaries,
            uint256 releaseDate,
            uint256 lastHeartbeat,
            uint256 heartbeatInterval,
            bool isActive,
            bool isExecuted,
            string memory notes
        )
    {
        InheritancePlan memory plan = inheritancePlans[owner];
        return (
            plan.beneficiaries,
            plan.releaseDate,
            plan.lastHeartbeat,
            plan.heartbeatInterval,
            plan.isActive,
            plan.isExecuted,
            plan.notes
        );
    }

    /**
     * @dev Get plans where user is a beneficiary
     */
    function getPlansAsBeneficiary(address beneficiary)
        public
        view
        returns (address[] memory)
    {
        return beneficiaryPlans[beneficiary];
    }

    /**
     * @dev Helper to remove beneficiary from lookup
     */
    function _removeBeneficiaryPlan(address beneficiary, address owner) private {
        address[] storage plans = beneficiaryPlans[beneficiary];
        for (uint256 i = 0; i < plans.length; i++) {
            if (plans[i] == owner) {
                plans[i] = plans[plans.length - 1];
                plans.pop();
                break;
            }
        }
    }

    /**
     * @dev Update BookOwnership contract address (if needed)
     */
    function updateBookOwnershipContract(address _newContract) public onlyOwner {
        bookOwnership = IBookOwnership(_newContract);
    }
}
