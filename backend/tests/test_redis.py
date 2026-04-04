"""
Tests für app/services/redis.py — Key-Builder-Funktionen.

Keine echte Redis-Verbindung nötig, da nur reine Funktionen getestet werden.
"""
import pytest
from app.services.redis import (
    key_pokemon_detail,
    key_pokemon_list,
    key_pokemon_filter,
    key_generation,
    key_generation_list,
    key_item,
    key_item_list,
)

PREFIX = "pokedex"


class TestKeyPokemonDetail:
    def test_by_name(self):
        assert key_pokemon_detail("bulbasaur") == f"{PREFIX}:pokemon:bulbasaur"

    def test_by_id(self):
        assert key_pokemon_detail("1") == f"{PREFIX}:pokemon:1"


class TestKeyPokemonList:
    def test_default(self):
        assert key_pokemon_list(20, 0) == f"{PREFIX}:pokemon_list:20:0"

    def test_offset(self):
        assert key_pokemon_list(20, 40) == f"{PREFIX}:pokemon_list:20:40"


class TestKeyPokemonFilter:
    def test_no_filter(self):
        key = key_pokemon_filter(20, 0, None, None)
        assert key == f"{PREFIX}:pokemon_filter:20_0"

    def test_type_only(self):
        key = key_pokemon_filter(20, 0, "water", None)
        assert "t:water" in key

    def test_generation_only(self):
        key = key_pokemon_filter(20, 0, None, 1)
        assert "g:1" in key

    def test_type_and_generation(self):
        key = key_pokemon_filter(20, 0, "fire", 2)
        assert "t:fire" in key
        assert "g:2" in key

    def test_different_filters_produce_different_keys(self):
        k1 = key_pokemon_filter(20, 0, "water", None)
        k2 = key_pokemon_filter(20, 0, "fire", None)
        assert k1 != k2


class TestKeyGeneration:
    def test_by_id(self):
        assert key_generation("1") == f"{PREFIX}:generation:1"

    def test_by_name(self):
        assert key_generation("generation-i") == f"{PREFIX}:generation:generation-i"

    def test_list(self):
        assert key_generation_list() == f"{PREFIX}:generation_list"


class TestKeyItem:
    def test_by_name(self):
        assert key_item("potion") == f"{PREFIX}:item:potion"

    def test_by_id(self):
        assert key_item("1") == f"{PREFIX}:item:1"

    def test_list(self):
        assert key_item_list(20, 0) == f"{PREFIX}:item_list:20:0"

    def test_list_with_offset(self):
        assert key_item_list(50, 100) == f"{PREFIX}:item_list:50:100"
