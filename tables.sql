DROP TABLE IF EXISTS `bans`;
CREATE TABLE `bans` (
  `ipH` varchar(50) NOT NULL,
  `duration` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `chunks`;
CREATE TABLE `chunks` (
  `x` int(11) NOT NULL,
  `y` int(11) NOT NULL,
  `data` varchar(8192) DEFAULT NULL,
  PRIMARY KEY (`x`,`y`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `options`;
CREATE TABLE `options` (
  `chunkSize` tinyint(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `tokens`;
CREATE TABLE `tokens` (
  `nonce` varchar(44) NOT NULL,
  `token` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;