import requests
import pandas as pd
import numpy as np
import datetime
import os

from jinja2 import Environment, FileSystemLoader

# jinja setup
THIS_DIR = os.path.dirname(os.path.abspath(__file__))

env = Environment(loader=FileSystemLoader(THIS_DIR), trim_blocks=True)
template = env.get_template("template.html")

# either use an api key from github or local
API_KEY = os.getenv("ODDS_API_KEY_REPO")

if API_KEY is None:
    print("API key not found in env, using SECRET.txt")
    with open("SECRET.txt", "r") as file:
        API_KEY = file.read()

SPORT = "americanfootball_nfl"
REGIONS = "us"
MARKETS = "spreads"
ODDS_FORMAT = "decimal"
DATE_FORMAT = "iso"
start_date = datetime.datetime.now(datetime.timezone.utc)


def main():
    odds_response = requests.get(
        f"https://api.the-odds-api.com/v4/sports/{SPORT}/odds",
        params={
            "api_key": API_KEY,
            "regions": REGIONS,
            "markets": MARKETS,
            "oddsFormat": ODDS_FORMAT,
            "dateFormat": DATE_FORMAT,
        },
    )

    if odds_response.status_code != 200:
        raise Exception(
            f"Failed to get odds: status_code {odds_response.status_code}, response body {odds_response.text}"
        )

    odds_json = odds_response.json()

    if not odds_json:
        os.makedirs("public", exist_ok=True)

        with open("public/index.html", "w") as fo:
            fo.write(
                template.render(
                    last_update=start_date.strftime("%b %-d %Y %H:%M:%S"),
                    odds_table="<p>Sorry, no football :(</p>",
                )
            )
        print("no games available, exiting")
        return

    print("Number of events:", len(odds_json))

    # Check the usage quota
    print("Remaining requests", odds_response.headers["x-requests-remaining"])
    print("Used requests", odds_response.headers["x-requests-used"])

    df = pd.json_normalize(
        odds_json, record_path="bookmakers", meta="commence_time")
    start_time = pd.to_datetime(df["commence_time"].str.strip())

    df = pd.json_normalize(df["markets"].to_list())
    df = pd.json_normalize(df.values.reshape(-1).tolist())["outcomes"]
    df = pd.json_normalize(df.tolist())

    df = pd.concat([start_time, df], axis=1)

    team1 = pd.DataFrame.from_records(df[0].to_list())
    team1 = pd.concat([df["commence_time"], team1], axis=1)

    team2 = pd.DataFrame.from_records(df[1].to_list())
    team2 = pd.concat([df["commence_time"], team2], axis=1)

    all_teams = pd.concat([team1, team2])

    # find the games played this week (current time until tuesday)
    TUESDAY = 1
    idx = (7 - start_date.weekday() + TUESDAY) % 7
    tue = start_date + datetime.timedelta(idx)
    end_date = tue.replace(hour=8, minute=0, second=0,
                           microsecond=0)  # tuesday at 8 UTC

    by_week = all_teams[start_date < all_teams["commence_time"]]
    by_week = by_week[by_week["commence_time"] < end_date]

    by_week = by_week.groupby(["commence_time", "name"]).mean()
    pd.set_option("display.max_rows", None)
    by_week.sort_values("point", inplace=True)
    by_week = by_week.reset_index()

    scores = pd.DataFrame(
        np.arange(1, len(by_week) / 2 + 1), columns=["score"])
    scores = pd.concat([scores[::-1], scores]
                       ).reset_index().drop(columns="index")

    assign_scores = pd.concat([by_week, scores], axis=1)
    assign_scores.drop(["price"], axis=1, inplace=True)
    assign_scores.rename(
        columns={
            "commence_time": "Commence Time (UTC)",
            "name": "Team Name",
            "point": "Avg Spread",
            "score": "Score",
        },
        inplace=True,
    )

    central_time = (
        assign_scores["Commence Time (UTC)"]
        .dt.tz_convert("US/Central")
        .rename("Commence Time (CT)")
    )
    assign_scores = pd.concat([central_time, assign_scores], axis=1)

    assign_scores["Team Name"] = assign_scores["Team Name"].replace("Los Angeles Chargers", "Los Angeles (LAC)")
    assign_scores["Team Name"] = assign_scores["Team Name"].replace("New York Jets", "New York (NYJ)")
    assign_scores["Team Name"] = assign_scores["Team Name"].replace("Los Angeles Rams", "Los Angeles (LAR)")
    assign_scores["Team Name"] = assign_scores["Team Name"].replace("New York Giants", "New York (NYG)")

    def delname(x):
        if "(" not in x:
            x = x.rsplit(" ", 1)[0]
        return x

    assign_scores["Team Name"] = assign_scores["Team Name"].apply(
        lambda x: delname(x)
    )

    # don't display the timezone
    assign_scores["Commence Time (CT)"] = assign_scores[
        "Commence Time (CT)"
    ].dt.tz_localize(None)
    assign_scores["Commence Time (UTC)"] = assign_scores[
        "Commence Time (UTC)"
    ].dt.tz_localize(None)

    os.makedirs("public", exist_ok=True)

    with open("public/index.html", "w") as fo:
        fo.write(
            template.render(
                last_update=start_date.strftime("%b %-d %Y %H:%M:%S"),
                odds_table=assign_scores.to_html(
                    justify="left",
                    classes=[
                        "table table-striped table-dark table-hover table-sm"],
                ),
            )
        )

    with open("public/odds.json", "w") as fo:
        fo.write(
            assign_scores.to_json(orient="records")
        )


if __name__ == "__main__":
    main()
