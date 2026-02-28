import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  propertyImage: f({
    image: { maxFileSize: "8MB", maxFileCount: 10 },
  })
    .middleware(() => ({}))
    .onUploadComplete(() => ({})),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
