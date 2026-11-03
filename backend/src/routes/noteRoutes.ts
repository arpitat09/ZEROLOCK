import { Router } from 'express';
import { NoteController } from '../controllers/noteController';
import { authGuard } from '../middleware/authGuard';
import { validate } from '../middleware/validate';
import { createNoteSchema, updateNoteSchema } from '../validators/notes';

const router = Router();

router.use(authGuard);

router.get('/', NoteController.getNotes);
router.post('/', validate(createNoteSchema), NoteController.createNote);
router.get('/:id', NoteController.getNoteById);
router.put('/:id', validate(updateNoteSchema), NoteController.updateNote);
router.delete('/:id', NoteController.deleteNote);

export default router;
