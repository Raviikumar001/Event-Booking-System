const { z } = require('zod');


const RoleSchema = z.enum(['organizer', 'attendee']);

const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: RoleSchema
});

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const CreateEventInput = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/)
});


const UpdateEventInput = CreateEventInput.partial();

module.exports = { RegisterInput, LoginInput, CreateEventInput, UpdateEventInput };
