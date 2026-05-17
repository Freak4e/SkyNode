import { fetchAttractions } from "./geoapifyProvider.js";

export async function getDestinationAttractions(destinationName: string) {
  const destination = destinationName.trim();

  if (!destination) {
    throw new Error("Destination is required.");
  }

  return fetchAttractions(destination);
}
