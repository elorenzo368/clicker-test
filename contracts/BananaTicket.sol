// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BananaTicket is ERC721, Ownable {
    uint256 public ticketIdCounter = 1;
    uint256 public constant TICKET_PRICE = 0.01 ether; // 0.01 RON por ticket
    uint256 public constant MAX_TICKETS_PER_HOUR = 5000;
    address public bananaNFTContract;

    mapping(uint256 => uint256) public ticketsMintedPerHour; // Tickets por hora (timestamp / 3600)
    mapping(address => uint256) public lastTicketMinted; // Último ticket minteado por usuario

    bool public paused;

    event TicketMinted(address indexed user, uint256 ticketId);
    event TicketsBurned(address indexed user, uint256[] ticketIds);

    constructor(
        address _bananaNFTContract
    ) ERC721("BananaTicket", "BTKT") Ownable(msg.sender) {
        require(_bananaNFTContract != address(0), "Invalid BananaNFT address");
        bananaNFTContract = _bananaNFTContract;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // Mintear un ticket NFT
    function mintTicket() external payable whenNotPaused {
        require(msg.value == TICKET_PRICE, "Incorrect payment");
        uint256 currentHour = block.timestamp / 3600;
        require(
            ticketsMintedPerHour[currentHour] < MAX_TICKETS_PER_HOUR,
            "Hourly limit reached"
        );

        uint256 ticketId = ticketIdCounter++;
        ticketsMintedPerHour[currentHour]++;
        lastTicketMinted[msg.sender] = ticketId;
        _safeMint(msg.sender, ticketId);

        emit TicketMinted(msg.sender, ticketId);
    }

    // Quemar tickets y canjear banana
    function burnTickets(
        uint256[] calldata ticketIds
    ) external payable whenNotPaused {
        uint256 ticketCount = ticketIds.length;
        require(ticketCount > 0, "No tickets provided");
        require(msg.value == ticketCount * TICKET_PRICE, "Incorrect payment");

        for (uint256 i = 0; i < ticketCount; i++) {
            require(ownerOf(ticketIds[i]) == msg.sender, "Not ticket owner");
            _burn(ticketIds[i]);
        }

        // Llamar al contrato BananaNFT para mintear
        IBananaNFT(bananaNFTContract).mintBanana{value: msg.value}(
            msg.sender,
            ticketCount
        );

        emit TicketsBurned(msg.sender, ticketIds);
    }

    // Retirar fondos (solo owner)
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
}

interface IBananaNFT {
    function mintBanana(address user, uint256 ticketCount) external payable;
}
