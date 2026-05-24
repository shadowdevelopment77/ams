/*
  Warnings:

  - Added the required column `checkout_photo_url` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkout_latitude" DOUBLE PRECISION,
ADD COLUMN     "checkout_longitude" DOUBLE PRECISION,
ADD COLUMN     "checkout_photo_url" TEXT NOT NULL;
