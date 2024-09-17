CREATE TABLE `users` (
  `id` integer PRIMARY KEY,
  `name` varchar(255),
  `email` varchar(255),
  `password` varchar(255),
  `birthdate` date,
  `address` varchar(255),
  `admin` boolean,
  `phonenumber` varchar(255)
);

CREATE TABLE `rendeles` (
  `id` integer PRIMARY KEY,
  `userId` integer,
  `userName` varchar(255),
  `pizzaId` varchar(255),
  `sizeId` integer,
  `address` varchar(255),
  `userPhonenumber` varchar(255),
  `finalprice` integer
);

CREATE TABLE `pizzak` (
  `id` integer PRIMARY KEY,
  `name` varchar(255),
  `price` integer
);

CREATE TABLE `toppings` (
  `id` integer PRIMARY KEY,
  `name` varchar(255),
  `price` integer
);

CREATE TABLE `size` (
  `id` integer PRIMARY KEY,
  `size` integer,
  `price` integer
);

CREATE TABLE `selectedTops` (
  `pizzaId` integer,
  `toppingId` integer
);

CREATE TABLE `rendelesTops` (
  `rendelesId` integer,
  `toppingId` integer
);

CREATE TABLE `rendelesDeleted` (
  `rendelesId` integer
);

CREATE TABLE `rendelesDone` (
  `rendelesId` integer
);

ALTER TABLE `users` ADD FOREIGN KEY (`id`) REFERENCES `rendeles` (`userId`);

ALTER TABLE `users` ADD FOREIGN KEY (`phonenumber`) REFERENCES `rendeles` (`userPhonenumber`);

ALTER TABLE `rendeles` ADD FOREIGN KEY (`sizeId`) REFERENCES `size` (`id`);

ALTER TABLE `selectedTops` ADD FOREIGN KEY (`pizzaId`) REFERENCES `pizzak` (`id`);

ALTER TABLE `selectedTops` ADD FOREIGN KEY (`toppingId`) REFERENCES `toppings` (`id`);

ALTER TABLE `rendeles` ADD FOREIGN KEY (`pizzaId`) REFERENCES `pizzak` (`id`);

ALTER TABLE `rendeles` ADD FOREIGN KEY (`id`) REFERENCES `rendelesTops` (`rendelesId`);

ALTER TABLE `toppings` ADD FOREIGN KEY (`id`) REFERENCES `rendelesTops` (`toppingId`);

ALTER TABLE `users` ADD FOREIGN KEY (`name`) REFERENCES `rendeles` (`userName`);

ALTER TABLE `rendelesDeleted` ADD FOREIGN KEY (`rendelesId`) REFERENCES `rendeles` (`id`);

ALTER TABLE `rendelesDone` ADD FOREIGN KEY (`rendelesId`) REFERENCES `rendeles` (`id`);
