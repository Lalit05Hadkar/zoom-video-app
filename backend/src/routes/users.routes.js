import { Router } from "express";
import {
    addToHistory, clearHistory, deleteFromHistory, getUserHistory,
    login, logout, me, register, requireUser,
} from "../controllers/user.controller.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", requireUser, me);
router.post("/logout", requireUser, logout);
router.post("/add_to_activity", requireUser, addToHistory);
router.get("/get_all_activity", requireUser, getUserHistory);
router.delete("/activity/:id", requireUser, deleteFromHistory);
router.delete("/activity", requireUser, clearHistory);

export default router;
