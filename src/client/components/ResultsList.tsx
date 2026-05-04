import type { FlightSearchResponse } from "../../shared/types.js";

type Props = {
  result: FlightSearchResponse | null;
};

export function ResultsList({ result }: Props) {
  if (!result) {
    return null;
  }

  return (
    <section className="results">
      {result.offers.length === 0 && (
        <div className="empty-state">
          <span>🕵️‍♂️</span>
          <strong>No offers returned for this search.</strong>
          <p>Try another date, route, or provider.</p>
        </div>
      )}

      {result.offers.map((offer, index) => (
        <article className="offer" key={`${offer.carrier}-${offer.departureTime}-${index}`}>
          <div>
            <p className="route">
              <span className="route-dot">✈️</span>
              {offer.departureTime || "Date not returned"}
              {offer.arrivalTime ? ` -> ${offer.arrivalTime}` : ""}
            </p>
            <p className="muted">{[offer.carrier, offer.stopsText, offer.source].filter(Boolean).join(" - ")}</p>
            {offer.expiresAt && <p className="muted">Cached price expires {new Date(offer.expiresAt).toLocaleString()}</p>}
          </div>
          <div className="price">
            <strong>{offer.priceText || "Price not returned"}</strong>
            {offer.bookingLink && (
              <a href={offer.bookingLink} target="_blank" rel="noreferrer">
                Search
              </a>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
