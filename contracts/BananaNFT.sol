// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IRoninVRFCoordinatorForConsumers.sol";

contract BananaNFT is ERC721, Ownable, VRFConsumer {
    uint256 public bananaIdCounter = 1;
    uint256 public constant BANANA_PRICE = 0.01 ether; // 0.01 RON por banana
    bytes32 internal keyHash;
    uint256 internal fee;

    struct BananaAttributes {
        string color;
        string background;
        string accessory;
        string tier;
    }

    mapping(uint256 => BananaAttributes) public bananaAttributes;
    mapping(bytes32 => uint256) public pendingRequestsByHash; // requestHash -> bananaId
    uint256 public constant CALLBACK_GAS_LIMIT = 500_000;
    uint256 public constant GAS_PRICE = 20e9;

    event BananaMinted(
        address indexed user,
        uint256 bananaId,
        uint256 ticketCount
    );
    event RandomnessRequested(uint256 requestId, uint256 bananaId);
    event WithdrawnRON(address indexed to, uint256 amount);

    constructor(
        address _vrfCoordinator
    )
        ERC721("BananaNFT", "BNFT")
        Ownable(msg.sender)
        VRFConsumer(_vrfCoordinator)
    {}

    // Mintear una banana NFT usando tickets quemados
    function mintBanana(address user, uint256 ticketCount) external payable {
        require(
            msg.sender == owner() ||
                msg.sender == 0x0000000000000000000000000000000000000000,
            "Only owner or ticket contract"
        );
        require(msg.value == BANANA_PRICE, "Incorrect payment");
        require(ticketCount == 1 || ticketCount == 10, "Invalid ticket count");

        uint256 bananaId = bananaIdCounter++;
        bytes32 requestHash = _requestRandomness(
            address(this).balance,
            CALLBACK_GAS_LIMIT,
            GAS_PRICE,
            msg.sender
        );
        pendingRequestsByHash[requestHash] = bananaId;

        emit BananaMinted(user, bananaId, ticketCount);
    }

    // Callback de Ronin VRF para asignar atributos
    function _fulfillRandomSeed(
        bytes32 _reqHash,
        uint256 randomness
    ) internal override {
        uint256 bananaId = pendingRequestsByHash[_reqHash];
        require(bananaId != 0, "Invalid request");

        address owner = ownerOf(bananaId);
        if (owner == address(0)) {
            _safeMint(msg.sender, bananaId);
        }

        // Generar atributos con randomness
        BananaAttributes memory attrs;
        uint256 ticketCount = (randomness % 10 == 0) ? 10 : 1; // Simula ticketCount basado en randomness (ajustar según llamada)
        attrs.tier = getTier(randomness, ticketCount);
        attrs.color = getColor(randomness, attrs.tier);
        attrs.background = getBackground(randomness, attrs.tier);
        attrs.accessory = getAccessory(randomness, attrs.tier);

        bananaAttributes[bananaId] = attrs;
        delete pendingRequestsByHash[_reqHash];
    }

    // Generar tier basado en randomness y ticketCount
    function getTier(
        uint256 randomness,
        uint256 ticketCount
    ) internal pure returns (string memory) {
        uint256 rand = randomness % 100;
        if (ticketCount == 1) {
            if (rand < 80) return "Common";
            if (rand < 95) return "Rare";
            if (rand < 99) return "Epic";
            return "Mythic";
        } else {
            if (rand < 50) return "Common";
            if (rand < 80) return "Rare";
            if (rand < 95) return "Epic";
            return "Mythic";
        }
    }

    // Generar color basado en tier
    function getColor(
        uint256 randomness,
        string memory tier
    ) internal pure returns (string memory) {
        uint256 rand = (randomness / 100) % 10;
        if (keccak256(bytes(tier)) == keccak256(bytes("Common"))) {
            if (rand < 4) return "Yellow";
            if (rand < 7) return "Red";
            return "Green";
        } else if (keccak256(bytes(tier)) == keccak256(bytes("Rare"))) {
            return rand < 5 ? "Blue" : "Purple";
        } else if (keccak256(bytes(tier)) == keccak256(bytes("Epic"))) {
            return rand < 5 ? "Silver" : "Bronze";
        } else {
            return rand < 5 ? "Gold" : "Platinum";
        }
    }

    // Generar fondo basado en tier
    function getBackground(
        uint256 randomness,
        string memory tier
    ) internal pure returns (string memory) {
        uint256 rand = (randomness / 1000) % 10;
        if (keccak256(bytes(tier)) == keccak256(bytes("Common"))) {
            return rand < 5 ? "White" : "Gray";
        } else if (keccak256(bytes(tier)) == keccak256(bytes("Rare"))) {
            return rand < 5 ? "Blue" : "Green";
        } else if (keccak256(bytes(tier)) == keccak256(bytes("Epic"))) {
            return rand < 5 ? "Galaxy" : "Clouds";
        } else {
            return rand < 5 ? "Rainbow" : "Neon";
        }
    }

    // Generar accesorio basado en tier
    function getAccessory(
        uint256 randomness,
        string memory tier
    ) internal pure returns (string memory) {
        uint256 rand = (randomness / 10000) % 10;
        if (keccak256(bytes(tier)) == keccak256(bytes("Common"))) {
            return "None";
        } else if (keccak256(bytes(tier)) == keccak256(bytes("Rare"))) {
            return rand < 5 ? "None" : (rand < 7 ? "Hat" : "Glasses");
        } else if (keccak256(bytes(tier)) == keccak256(bytes("Epic"))) {
            return rand < 5 ? "Crown" : "Monocle";
        } else {
            return rand < 5 ? "Aura" : "Scepter";
        }
    }

    // Función original que envía al owner
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No RON to withdraw");

        payable(owner()).transfer(amount);
        emit WithdrawnRON(owner(), amount);
    }

    // Nueva función que permite especificar el destino
    function withdrawTo(address payable _to) external onlyOwner {
        require(_to != address(0), "Invalid address");
        uint256 amount = address(this).balance;
        require(amount > 0, "No RON to withdraw");

        _to.transfer(amount);
        emit WithdrawnRON(_to, amount);
    }
}
