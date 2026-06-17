interface RatingStarsProps {
  value: number;
  onChange: (value: number) => void;
}

export default function RatingStars({ value, onChange }: RatingStarsProps) {
  return (
    <div className="flex gap-1 text-xl">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={star <= value ? "text-amber-500" : "text-stone-300"}
          aria-label={`${star}점`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
