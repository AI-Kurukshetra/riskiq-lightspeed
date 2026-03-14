import { z } from "zod";

const indianMobileRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

export const applicantSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().regex(indianMobileRegex, "Enter valid 10-digit Indian mobile"),
  dob: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => {
      const dob = new Date(value);
      if (Number.isNaN(dob.getTime())) return false;
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return age >= 16;
    }, "Minimum age is 16 years"),
  pan: z.string().min(10, "PAN must be 10 characters").max(10, "PAN must be 10 characters"),
  addressLine1: z.string().min(3, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(pincodeRegex, "Pincode must be 6 digits"),
  occupation: z.string().min(1, "Occupation is required"),
  annualIncomeBand: z.string().min(1, "Annual income is required"),
});

export const vehicleSchema = z.object({
  vehicleType: z.enum(["bike", "car", "suv", "commercial"]),
  make: z.string().min(1, "Vehicle make is required"),
  model: z.string().min(1, "Vehicle model is required"),
  year: z.number().int().min(2000, "Year must be >= 2000").max(2026, "Year must be <= 2026"),
  registrationNumber: z.string().min(6, "Registration number is required"),
  vin: z.string().min(6, "VIN/Chassis number is required"),
  fuelType: z.enum(["petrol", "diesel", "cng", "electric", "hybrid"]),
  usage: z.enum(["personal", "commercial"]),
  parking: z.enum(["garage", "open", "street"]),
  hasModifications: z.boolean(),
});

const accidentSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(3),
  atFault: z.boolean(),
});

const violationSchema = z.object({
  date: z.string().min(1),
  type: z.enum(["speeding", "signal_jump", "wrong_lane", "dui", "reckless", "other"]),
});

export const drivingSchema = z.object({
  drivingExperienceYears: z.number().min(0).max(80),
  licenseNumber: z.string().min(6, "License number is required"),
  licenseType: z.enum(["lmv", "mcwg", "hmv", "mcwog"]),
  accidents: z.array(accidentSchema).max(5),
  violations: z.array(violationSchema).max(5),
  previousInsurance: z.boolean(),
  previousInsurer: z.string().optional(),
  yearsInsured: z.number().int().min(0).optional(),
  ncbYears: z.number().int().min(0).max(5),
});

export const coverageSchema = z.object({
  coverageType: z.enum(["third_party", "third_party_fire_theft", "comprehensive"]),
  addons: z.array(z.string()),
  idv: z.number().min(50000).max(3000000),
});

export const documentsSchema = z.object({
  idProof: z.string().optional(),
  vehicleRc: z.string().optional(),
  previousPolicy: z.string().optional(),
});

export const reviewSchema = z.object({
  acceptTerms: z.boolean().refine((value) => value, { message: "Please accept terms & conditions to continue" }),
});

export const applicationFormSchema = z.object({
  applicant: applicantSchema,
  vehicle: vehicleSchema,
  driving: drivingSchema,
  coverage: coverageSchema,
  documents: documentsSchema,
  review: reviewSchema,
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;
