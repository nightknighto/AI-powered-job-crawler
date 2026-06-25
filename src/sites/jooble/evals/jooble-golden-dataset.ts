import { GoldenEntry } from "../../../types/GoldenEntry.js";
import { JoobleJob } from "../../../types/JoobleJob.js";


const realJobs: GoldenEntry<JoobleJob>[] = []


const syntheticJobs: GoldenEntry<JoobleJob>[] = [

]

export const joobleGoldenDataset = [...realJobs, ...syntheticJobs];
