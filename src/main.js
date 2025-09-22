import "./style.css";
import PlayerModelThree from "./three";

document.addEventListener("DOMContentLoaded", init);

function init() {
  const root = document.querySelector("#root");
  new PlayerModelThree(root);
}
