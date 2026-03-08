-- Add sub_tour_title column to tour_spots for sub-tour grouping and filtering
ALTER TABLE tour_spots ADD COLUMN sub_tour_title TEXT;
