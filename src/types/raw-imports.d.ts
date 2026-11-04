// scripts/turbo-raw-loader.cjs gives .html modules their text as the default
// export — the `?raw` contract the registered OrbGallery source expects.
declare module "*.html" {
  const content: string;
  export default content;
}
