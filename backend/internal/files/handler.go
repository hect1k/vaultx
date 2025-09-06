package files

import "github.com/gofiber/fiber/v2"

func Upload(c *fiber.Ctx) error {
	// TODO: implement AES encryption + storage
	return c.JSON(fiber.Map{"message": "Upload endpoint stub"})
}

func Search(c *fiber.Ctx) error {
	// TODO: implement searchable encryption lookup
	return c.JSON(fiber.Map{"results": []string{}})
}
