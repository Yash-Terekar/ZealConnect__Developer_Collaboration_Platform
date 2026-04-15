import express from "express";
import { signup, login, getProfile } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/profile", getProfile);

export default router;
